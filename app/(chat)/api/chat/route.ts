import { auth } from '@/server/auth';
import {
  deleteChatById,
  getChatById
} from '@/server/db/queries';
import { openai } from '@ai-sdk/openai';
import {
  experimental_createMCPClient as createMCPClient,
  InvalidToolArgumentsError,
  NoSuchToolError,
  smoothStream,
  streamText,
  ToolExecutionError
} from 'ai';
import { NextRequest } from 'next/server';

const MCP_SYSTEM_PROMPT = 'You are a friendly assistant. Do not use emojis in your responses. Make sure to format code blocks, and add language/title to it. When an information is provided, if possible, try to store it for future reference.';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Debug the request body
    const requestBody = await request.json();
    console.log('Received request body:', JSON.stringify({
      messagesCount: requestBody.messages?.length || 0,
      apiKeyProvided: !!requestBody.apiKey,
      apiKeyLength: requestBody.apiKey?.length || 0
    }));
    
    const { messages, apiKey } = requestBody;
    
    // Enhanced debug for API key check
    if (!apiKey) {
      console.error('API key missing in request');
      return Response.json({ error: 'API key is required' }, { status: 400 });
    }
    
    if (apiKey.trim() === '') {
      console.error('API key is empty string');
      return Response.json({ error: 'API key cannot be empty' }, { status: 400 });
    }
    
    console.log('API key validation successful, length:', apiKey.length);
    
    let client = await createMCPClient({
      transport: {
        type: 'sse',
        url: process.env.NODE_ENV === 'development'
          ? (process.env.NEXT_PUBLIC_DEV_MCP_URL || 'http://localhost:3001/sse')
          : process.env.NODE_ENV === 'production'
            ? (process.env.NEXT_PUBLIC_MEETINGBAAS_MCP_URL || 'https://mcp.meetingbaas.com/sse')
            : (process.env.NEXT_PUBLIC_MEETINGBAAS_PRE_PROD_MCP_URL || 'https://mcp.pre-prod-meetingbaas.com/sse'),
        headers: {
          'x-meeting-baas-api-key': apiKey,
        }
      },
      onUncaughtError: (error) => {
        console.error('MCP Client error:', error);
      },
    });

    const toolSet = await client.tools();
    
    // No setApiKeyTool - we rely on the client sending the key from localStorage
    
    const result = streamText({
      model: openai('gpt-4o-mini'),
      tools: toolSet, // Use all tools from MCP except setting API key
      maxSteps: 10,
      experimental_transform: [
        smoothStream({
          chunking: 'word',
        }),
      ],
      onStepFinish: async ({ toolResults }) => {
        console.log(`Step Results: ${JSON.stringify(toolResults, null, 2)}`);
      },
      onFinish: async () => {
        await client.close();
      },
      onError: async () => {
        await client.close();
      },
      system: `${MCP_SYSTEM_PROMPT} You have access to the MeetingBaaS API.`,
      messages,
    });

    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        if (NoSuchToolError.isInstance(error)) {
          return 'The model tried to call a unknown tool.';
        } else if (InvalidToolArgumentsError.isInstance(error)) {
          return 'The model called a tool with invalid arguments.';
        } else if (ToolExecutionError.isInstance(error)) {
          console.log(error);
          return 'An error occurred during tool execution.';
        } else {
          return 'An unknown error occurred.';
        }
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Failed to generate text' });
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
