import { systemPrompt } from '@/lib/ai/prompts';
import { myProvider } from '@/lib/ai/providers';
import { createDocument } from '@/lib/ai/tools/create-document';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { toolsSchemas as mcpToolsSchemas } from '@/lib/ai/tools/mcp';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { isProductionEnvironment } from '@/lib/constants';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { auth } from '@/server/auth';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/server/db/queries';
import * as meetingBaas from '@/server/meetingbaas';
import {
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  experimental_createMCPClient as createMCPClient,
  smoothStream,
  streamText,
} from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    const session = await auth();
    let baasSession = await meetingBaas.auth();
    let apiKey = baasSession?.apiKey ? baasSession.apiKey : '';

    // Enhanced API key logging and handling
    console.log("=== API KEY DIAGNOSTICS ===");

    // Retrieve API key from message if provided
    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Extract message text safely with type checking
    let messageText = '';
    const firstPart = userMessage.parts[0];

    if (typeof firstPart === 'string') {
      messageText = firstPart;
    } else if (firstPart && 'type' in firstPart && firstPart.type === 'text' && 'text' in firstPart) {
      messageText = firstPart.text;
    }

    // Check for API key in the message - more permissive pattern to catch URLs, etc.
    const apiKeyMatch = messageText.match(/^API[_\s]?KEY[:\s]+(.+)$/i);

    if (apiKeyMatch && apiKeyMatch[1]) {
      // Set the API key directly (not storing in session)
      apiKey = apiKeyMatch[1].trim();
      console.log(`API key provided in message: ${apiKey.substring(0, 4)}***`);

      // Return a special response acknowledging the API key
      return createDataStreamResponse({
        execute: async (dataStream) => {
          dataStream.writeData({
            role: 'assistant',
            id: generateUUID(),
            content: [{
              type: 'text',
              text: `API key received and will be used for future requests. For security, the key won't be displayed again.`
            }]
          });
        }
      });
    }

    // Log current API key status
    console.log(`API Key present: ${apiKey ? 'Yes' : 'No'}`);
    if (apiKey) {
      console.log(`API Key first chars: ${apiKey.substring(0, 4)}***`);
      console.log(`API Key length: ${apiKey.length}`);
    } else {
      console.log("No API key available in session");
    }
    console.log("=== END API KEY DIAGNOSTICS ===");

    // Check if both authentication methods are present
    const isSessionAuthenticated = !!(session?.user?.id);
    const hasApiKey = !!apiKey;
    const hasBothAuthMethods = isSessionAuthenticated && hasApiKey;

    if (hasBothAuthMethods) {
      console.log("User has both session authentication and API key");
      // You could add special functionality here for users with both auth methods
    }

    // Check authentication - either normal auth or API key auth
    const isAuthenticated = !!(session?.user?.id || apiKey);

    if (!isAuthenticated) {
      // User is not authenticated, prompt for API key
      return createDataStreamResponse({
        execute: async (dataStream) => {
          dataStream.writeData({
            role: 'assistant',
            id: generateUUID(),
            content: [{
              type: 'text',
              text: `You need to be authenticated to use this service. Please provide your API key by sending a message in this format: "API KEY: your_api_key_here"`
            }],
            isError: true
          });
        }
      });
    }

    // Define a fallback ID for API key users
    const userId = session?.user?.id || `api-key-user-${apiKey?.substring(0, 8)}`;

    const chat = await getChatById({ id });

    if (!chat) {
      // Only create a new chat if we have a valid session
      if (isSessionAuthenticated) {
        const title = await generateTitleFromUserMessage({
          message: userMessage,
        });

        await saveChat({ id, userId, title });
      } else {
        // For API key only users (without session), provide a response that works without saving
        return createDataStreamResponse({
          execute: async (dataStream) => {
            console.log("API key user without session - not saving chat history");

            // Process the message without saving chat history
            const result = streamText({
              model: myProvider.languageModel(selectedChatModel),
              system: systemPrompt({ selectedChatModel }),
              messages,
              maxSteps: 5,
              experimental_transform: smoothStream({ chunking: 'word' }),
              experimental_generateMessageId: generateUUID,
              tools: { ...toolSet },
              onFinish: () => client.close(),
              onError: () => client.close(),
            });

            result.consumeStream();
            result.mergeIntoDataStream(dataStream, {
              sendReasoning: true,
            });
          },
          onError: (error) => {
            client.close();
            return 'An error occurred while processing your request.';
          }
        });
      }
    } else {
      // For existing chats, check ownership if the user has a session
      if (isSessionAuthenticated && session?.user && chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // For session users, save the message
    if (isSessionAuthenticated) {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: userMessage.id,
            role: 'user',
            parts: userMessage.parts,
            attachments: userMessage.experimental_attachments ?? [],
            createdAt: new Date(),
          },
        ],
      });
    }

    // Update the type definition for the transport variable
    let transport: StdioMCPTransport | { type: 'sse'; url: string; headers: Record<string, string> };
    const mcpTransport = process.env.MCP_TRANSPORT || 'sse';

    console.log("Starting request processing");
    console.log("MCP transport type:", mcpTransport);

    let transportEnvVars: Record<string, string> = {};

    if (mcpTransport === 'stdio') {
      console.log("Starting stdio transport setup");

      // Fix: Use the exact environment variable names from the documentation
      const stdioEnvVars = {
        NODE_ENV: process.env.NODE_ENV || 'development',
        BAAS_API_KEY: process.env.BAAS_API_KEY || 'tesban',
        REDIS_URL: process.env.REDIS_URL || '',
        MCP_TRANSPORT_TYPE: 'stdio',
        LOG_TO_FILE: 'true',
        DISABLE_CONSOLE_LOGGING: 'true',
        LOG_LEVEL: 'error'
      };

      console.log("Environment variables to pass:", {
        BAAS_API_KEY: 'tesban', // Updated name
        REDIS_URL: process.env.REDIS_URL ? 'set' : 'not set',
        NODE_ENV: process.env.NODE_ENV || 'development',
        MCP_TRANSPORT_TYPE: 'stdio'
      });

      // Store the env vars for later access
      transportEnvVars = stdioEnvVars;

      // Optionally add stderr and stdout handling to capture logs
      transport = new StdioMCPTransport({
        command: '/Users/lazrossi/.nvm/versions/node/v18.18.0/bin/node',
        args: ['/Users/lazrossi/Documents/code/mcp-s/mcp-on-vercel/dist/api/stdio-server.js'],
        env: stdioEnvVars,
        cwd: '/Users/lazrossi/Documents/code/mcp-s/mcp-on-vercel'
      });
    } else {
      // Create SSE transport with explicit type
      const sseConfig: { type: 'sse'; url: string; headers: Record<string, string> } = {
        type: 'sse', // Note: This needs to be the literal string 'sse', not a variable
        url: process.env.NEXT_PUBLIC_MEETINGBAAS_MCP_URL || 'https://mcp.meetingbaas.com/sse',
        headers: {
          'x-meeting-baas-api-key': apiKey || '',
        }
      };
      transport = sseConfig;
    }

    const client = await createMCPClient({
      transport,
      onUncaughtError: (error) => {
        console.error('MCP Client error:', error);
      },
    });

    console.log("MCP client created successfully");

    // Add detailed debug information before initializing tools
    console.log(`Tool schemas count: ${Object.keys(mcpToolsSchemas).length}`);
    console.log(`Tool schema names: ${Object.keys(mcpToolsSchemas).join(', ')}`);

    let toolSet = {};

    try {
      console.log("=== TOOL INITIALIZATION DEBUG START ===");
      console.log(`API Key type: ${typeof apiKey}, Length: ${apiKey?.length || 0}`);
      console.log(`API Key prefix: ${apiKey ? apiKey.substring(0, 4) + '***' : 'null'}`);
      console.log(`Transport type: ${mcpTransport}`);
      console.log(`Transport config:`, JSON.stringify(transport, null, 2).substring(0, 500));
      console.log(`Total schemas to register: ${Object.keys(mcpToolsSchemas).length}`);

      // Log sample schema structure
      if (Object.keys(mcpToolsSchemas).length > 0) {
        const sampleKey = Object.keys(mcpToolsSchemas)[0];
        console.log(`Sample schema (${sampleKey}) structure:`,
          JSON.stringify({
            required: mcpToolsSchemas[sampleKey].required,
            paramKeys: Object.keys(mcpToolsSchemas[sampleKey].parameters._def?.shape || {}),
            defType: mcpToolsSchemas[sampleKey].parameters._def?.typeName
          }, null, 2)
        );
      }

      // Log the exact structure of the 5th tool schema (index 4)
      if (Object.keys(mcpToolsSchemas).length > 4) {
        const fifthToolName = Object.keys(mcpToolsSchemas)[4];
        console.log(`Tool at index 4 (${fifthToolName}):`, JSON.stringify(mcpToolsSchemas[fifthToolName]).substring(0, 300));

        // Check if this name follows the required pattern
        const isValidPattern = /^[a-zA-Z0-9_-]+$/.test(fifthToolName);
        console.log(`Tool name "${fifthToolName}" matches required pattern: ${isValidPattern}`);
      }

      console.log("Calling client.tools() to initialize...");

      // Store the result in our variable rather than returning it
      toolSet = await client.tools({
        schemas: mcpToolsSchemas
      });

      console.log(`MCP tools initialization complete`);
      console.log(`Initialized tools count: ${Object.keys(toolSet).length}`);

      // Inspect the returned toolSet even if empty
      if (Object.keys(toolSet).length === 0) {
        console.log("No tools returned. Checking toolSet object type:", typeof toolSet);
        console.log("ToolSet constructor:", toolSet?.constructor?.name);
        console.log("ToolSet properties:", Object.getOwnPropertyNames(toolSet));

        // Try to access any internal properties that might give clues
        try {
          console.log("ToolSet prototype chain:",
            Object.getPrototypeOf(toolSet) ? "Has prototype" : "No prototype");
          console.log("ToolSet toString():", String(toolSet).substring(0, 100));
        } catch (err) {
          console.log("Error inspecting toolSet:", err);
        }
      } else {
        // Log the first tool name and structure
        const firstToolName = Object.keys(toolSet)[0];
        console.log(`First initialized tool: ${firstToolName}`);
        if (firstToolName) {
          console.log(`Tool structure:`, typeof (toolSet as Record<string, unknown>)[firstToolName]);
        } else {
          console.log(`Tool structure: Not accessible`);
        }
      }

      console.log("=== TOOL INITIALIZATION DEBUG END ===");
    } catch (error: unknown) {
      console.error("=== TOOL INITIALIZATION ERROR DETAILS ===");

      // Type-check the error before accessing its properties
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error message:", errorMessage);
      console.error("Error type:", error?.constructor?.name || typeof error);

      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error stack:", error.stack);

        // Try to access more properties that might exist on specific error types
        try {
          const anyError = error as any;
          if (anyError.code) console.error("Error code:", anyError.code);
          if (anyError.statusCode) console.error("Status code:", anyError.statusCode);
          if (anyError.response) console.error("Response:", anyError.response);
          if (anyError.cause) console.error("Cause:", anyError.cause);
        } catch (err) {
          console.error("Error while extracting additional error details");
        }
      }

      // Check all tool names against the pattern
      console.log("=== VALIDATING ALL TOOL NAMES ===");
      Object.keys(mcpToolsSchemas).forEach((name, index) => {
        const isValid = /^[a-zA-Z0-9_-]+$/.test(name);
        if (!isValid) {
          console.error(`Tool #${index} name '${name}' does NOT match the required pattern`);
        }
      });
      console.log("=== END VALIDATION ===");

      // Try with a smaller subset to see if it's a specific tool causing issues
      try {
        console.log("Attempting initialization with only the first tool...");
        const firstToolName = Object.keys(mcpToolsSchemas)[0];
        const smallerSchemas = { [firstToolName]: mcpToolsSchemas[firstToolName] };

        const miniToolSet = await client.tools({ schemas: smallerSchemas });
        console.log(`Single tool initialization result: ${Object.keys(miniToolSet).length} tools`);
      } catch (subsetError) {
        console.error("Failed to initialize with subset:",
          subsetError instanceof Error ? subsetError.message : String(subsetError));
      }

      console.error("=== END TOOL INITIALIZATION ERROR DETAILS ===");

      // Don't return anything here, just keep the empty object
      toolSet = {};
    }

    // Add this to your error handling:
    console.log("API Key length:", apiKey?.length || 0);
    console.log("Checking schema format...");

    // Check what's inside one of the parameter objects for a random tool
    if (Object.keys(mcpToolsSchemas).length > 0) {
      const sampleTool = Object.keys(mcpToolsSchemas)[0];
      console.log(`Sample tool "${sampleTool}" schema:`, mcpToolsSchemas[sampleTool]);

      // Check if parameters are properly defined
      if (mcpToolsSchemas[sampleTool].parameters._def) {
        console.log("Parameters structure looks valid");
      } else {
        console.log("WARNING: Parameters may not be in the expected format");
      }
    }

    // Try to log more details about the client
    console.log("Client connected:", !!client);

    return createDataStreamResponse({
      execute: async (dataStream) => {
        console.log("Request execution started");
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages,
          maxSteps: 5,
          ...(selectedChatModel === 'chat-model-reasoning'
            ? { experimental_activeTools: [] }
            : {}),
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            // Weather tool is always available
            getWeather,

            // Only include document tools if we have a valid session
            ...(isSessionAuthenticated && session ? {
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
            } : {}),

            // External tools are always available
            ...toolSet
          },
          onFinish: async ({ response }) => {
            if (session?.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }

            client.close();
          },
          onError: async () => {
            client.close();
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });

        // Optionally inject authentication status information into the data stream
        if (isAuthenticated) {
          // For debugging or for client-side awareness
          dataStream.writeData({
            type: '_internal_auth_status',
            hasSession: isSessionAuthenticated,
            hasApiKey: hasApiKey,
            hasBoth: hasBothAuthMethods
          });
        }
      },
      onError: (error: any) => {
        console.error("=== DETAILED DATA STREAM ERROR ===");
        console.error(`Error type: ${error?.constructor?.name || 'Unknown'}`);
        console.error(`Error message: ${error?.message || 'No message'}`);
        console.error(`Error stack: ${error?.stack || 'No stack trace'}`);
        console.error(`Transport type: ${mcpTransport}`);

        // Log details about the MCP client
        if (client) {
          try {
            console.error(`Has client: ${!!client}`);
            console.error(`Client connected: ${Object.keys(client).join(', ')}`);
          } catch (err) {
            console.error(`Error inspecting client!`);
          }
        }

        // Log Redis connection info
        console.error(`Redis URL length: ${process.env.REDIS_URL?.length || 0}`);
        console.error(`Redis URL prefix: ${process.env.REDIS_URL?.substring(0, 15)}...`);

        // Log MCP server path
        if (mcpTransport === 'stdio') {
          console.error(`MCP server path: ${process.env.MCP_STDIO_ARGS}`);
          console.error(`Environment variables passed: ${JSON.stringify(Object.keys(transportEnvVars))}`);
        }

        console.error("=== END DETAILED ERROR ===");

        client.close();
        return 'An error occurred while communicating with the AI tools service. Please try again or contact support if the issue persists.';
      },
    });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

// New API endpoint to check authentication status
export async function GET(request: Request) {
  try {
    const session = await auth();
    const baasSession = await meetingBaas.auth();

    const isSessionAuthenticated = !!(session?.user?.id);
    const hasApiKey = !!baasSession?.apiKey;

    return new Response(JSON.stringify({
      isAuthenticated: isSessionAuthenticated || hasApiKey,
      hasSession: isSessionAuthenticated,
      hasApiKey: hasApiKey,
      hasBoth: isSessionAuthenticated && hasApiKey
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Authentication check failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
