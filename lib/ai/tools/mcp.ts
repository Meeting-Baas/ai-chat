import * as meetingBaas from '@/server/meetingbaas';
import { experimental_createMCPClient as createMCPClient } from 'ai';

// Keep track of active clients
type MCPClientType = Awaited<ReturnType<typeof createMCPClient>>;
let publicClient: MCPClientType | null = null;
let privateClient: MCPClientType | null = null;
let speakingClient: MCPClientType | null = null;

const environment = process.env.ENVIRONMENT || '';
// Add a dot for proper subdomain formatting if environment is not empty
const envPrefix = environment ? `${environment}.` : '';

export async function getMCPTools() {
  const baasSession = await meetingBaas.auth();
  if (!baasSession?.jwt || !baasSession?.apiKey) {
    console.error('Failed to get auth credentials - missing JWT or API key');
    return {
      publicTools: {},
      privateTools: {},
      speakingTools: {},
      allTools: {},
    };
  }

  let publicTools = {};
  let privateTools = {};
  let speakingTools = {};

  try {
    if (!privateClient) {
      privateClient = await createMCPClient({
        transport: {
          type: 'sse',
          url: `https://mcp-private.${envPrefix}meetingbaas.com/sse`,
          headers: {
            Cookie: `jwt=${baasSession.jwt}`,
          },
        },
        onUncaughtError: (error) => {
          console.error('Private MCP Client error:', error);
          privateClient = null;
        },
      });
    }

    if (privateClient) {
      privateTools = await privateClient.tools();
    }
  } catch (error) {
    console.error('Failed to connect to private MCP endpoint:', error);
    privateClient = null;
  }

  try {
    if (!publicClient) {
      publicClient = await createMCPClient({
        transport: {
          type: 'sse',
          url: `https://mcp.${envPrefix}meetingbaas.com/sse`,
          headers: {
            'x-meeting-baas-api-key': baasSession.apiKey,
          },
        },
        onUncaughtError: (error) => {
          console.error('Public MCP Client error:', error);
          publicClient = null;
        },
      });
    }

    if (publicClient) {
      publicTools = await publicClient.tools();
    }
  } catch (error) {
    console.error('Failed to connect to public MCP endpoint:', error);
    publicClient = null;
  }

  try {
    if (!speakingClient) {
      speakingClient = await createMCPClient({
        transport: {
          type: 'sse',
          url: `https://speaking.${envPrefix}meetingbaas.com/sse`,
          headers: {
            'x-meeting-baas-api-key': baasSession.apiKey,
          },
        },
        onUncaughtError: (error) => {
          console.error('Speaking MCP Client error:', error);
          speakingClient = null;
        },
      });
    }

    if (speakingClient) {
      speakingTools = await speakingClient.tools();
    }
  } catch (error) {
    console.error('Failed to connect to speaking MCP endpoint:', error);
    speakingClient = null;
  }

  return {
    publicTools,
    privateTools,
    speakingTools,
    allTools: { ...publicTools, ...privateTools, ...speakingTools },
  };
}

export async function closeMCPClients() {
  if (publicClient) {
    await publicClient.close();
    publicClient = null;
  }
  if (privateClient) {
    await privateClient.close();
    privateClient = null;
  }
  if (speakingClient) {
    await speakingClient.close();
    speakingClient = null;
  }
}
