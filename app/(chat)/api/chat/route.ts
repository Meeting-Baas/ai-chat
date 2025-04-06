import {
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  experimental_createMCPClient as createMCPClient,
  smoothStream,
  streamText,
} from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { auth } from '@/server/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/server/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import * as meetingBaas from '@/server/meetingbaas';
import { toolsSchemas as mcpToolsSchemas } from '@/lib/ai/tools/mcp';
import path from 'path';
import { exec } from 'child_process';
import { z } from 'zod';

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
    const baasSession = await meetingBaas.auth();

    // Log a portion of the API key (first few characters only for security)
    console.log(`API Key starts with: ${baasSession?.apiKey?.substring(0, 4)}*** (length: ${baasSession?.apiKey?.length || 0})`);
    console.log(`API Key status: ${baasSession?.apiKey ? 'Present' : 'Missing'}`);

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

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

    // Determine which transport to use
    let transport;
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
      // Create SSE transport with exact type signature
      const sseConfig: { type: 'sse'; url: string; headers: Record<string, string> } = {
        type: 'sse',
        url: process.env.NEXT_PUBLIC_MEETINGBAAS_MCP_URL || 'https://mcp.meetingbaas.com/sse',
        headers: {
          'x-meeting-baas-api-key': baasSession?.apiKey ?? '',
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

    const toolSet = await client.tools({
      schemas: mcpToolsSchemas
    });
    console.log("MCP tools initialized:", Object.keys(toolSet).length);

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
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            ...toolSet
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
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
