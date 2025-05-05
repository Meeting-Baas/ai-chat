import * as meetingBaas from '@/server/meetingbaas';
import { experimental_createMCPClient as createMCPClient } from 'ai';

// Keep track of active clients
type MCPClientType = Awaited<ReturnType<typeof createMCPClient>>;
let publicClient: MCPClientType | null = null;
let privateClient: MCPClientType | null = null;
let docClient: MCPClientType | null = null;

export async function getMCPTools() {
    const baasSession = await meetingBaas.auth();
    if (!baasSession?.jwt || !baasSession?.apiKey) {
        console.error('Failed to get auth credentials - missing JWT or API key');
        return {
            publicTools: {},
            privateTools: {},
            //docTools: {},
            allTools: {}
        };
    }

    let publicTools = {};
    let privateTools = {};
    //let docTools = {};

    try {
        if (!privateClient) {
            privateClient = await createMCPClient({
                transport: {
                    type: 'sse',
                    url: 'https://mcp-private.meetingbaas.com/sse',
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
                    url: 'https://mcp.meetingbaas.com/sse',
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

    // try {
    //     // Create or reuse documentation client - no auth required
    //     if (!docClient) {
    //         docClient = await createMCPClient({
    //             transport: {
    //                 type: 'sse',
    //                 url: 'https://mcp-documentation.meetingbaas.com/sse',
    //             },
    //             onUncaughtError: (error) => {
    //                 console.error('Documentation MCP Client error:', error);
    //                 // Reset client on error so it can be recreated
    //                 docClient = null;
    //             },
    //         });
    //     }

    //     if (docClient) {
    //         docTools = await docClient.tools();
    //     }
    // } catch (error) {
    //     console.error('Failed to connect to documentation MCP endpoint:', error);
    //     docClient = null;
    // }

    return {
        // allTools: { ...publicTools, ...privateTools, ...docTools }
        allTools: { ...publicTools, ...privateTools }
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
    // if (docClient) {
    //     await docClient.close();
    //     docClient = null;
    // }
}
