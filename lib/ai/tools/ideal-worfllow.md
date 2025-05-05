# Ideal Workflow for Implementing Meeting BaaS SDK

This guide outlines the best practices for integrating the Meeting BaaS SDK into a Next.js or Node.js application with MCP tools.

## Installation

```bash
# Install the SDK
npm install @meeting-baas/sdk
# or
yarn add @meeting-baas/sdk
# or
pnpm add @meeting-baas/sdk
```

## Method 1: Directly Import Pre-Built Tools (Recommended)

The cleanest approach is to import the pre-built tools directly from the SDK. These tools already have the correct schema format required by the MCP client.

```typescript
// tools.ts
import {
  join_meeting_tool,
  leave_meeting_tool,
  get_meeting_data_tool,
  delete_data_tool,
  bots_with_metadata_tool,
  list_recent_bots_tool,
  retranscribe_bot_tool,
  create_calendar_tool,
  delete_calendar_tool,
  get_calendar_tool,
  get_event_tool,
  list_calendars_tool,
  list_events_tool,
  list_raw_calendars_tool,
  patch_bot_tool,
  resync_all_calendars_tool,
  schedule_record_event_tool,
  unschedule_record_event_tool,
  update_calendar_tool,
} from "@meeting-baas/sdk/tools";

// Export with your preferred naming convention
export const toolsSchemas = {
  joinMeeting: join_meeting_tool,
  leaveMeeting: leave_meeting_tool,
  getMeetingData: get_meeting_data_tool,
  deleteData: delete_data_tool,
  // ... other tools
};
```

## Method 2: Using the SDK Bundle with MPC Tools

For an MPC server approach, you can use the bundle mode:

```typescript
// mcp-server.ts
import { SDK_MODE, registerTools, BaasClient } from "@meeting-baas/sdk/bundle";
import { allTools } from "@meeting-baas/sdk/tools";

// Register all tools with your MPC server
async function setupMCPServer() {
  // Create client for actual API calls
  const client = new BaasClient({
    apiKey: process.env.MEETING_BAAS_API_KEY,
  });

  // Register tools with your server
  await registerTools(allTools, myServerRegisterToolFunction);

  console.log("All Meeting BaaS tools registered");
}
```

## Method 3: Custom Tool Schemas (Advanced)

If you need custom schemas, ensure you follow these rules:

```typescript
// custom-tools.ts
import { z } from "zod";

export const toolsSchemas = {
  joinMeeting: {
    parameters: z.object({
      meetingUrl: z.string(),
      botName: z.string(),
      reserved: z.boolean(),
      // Optional parameters
      webhookUrl: z.string().optional(),
      recordingMode: z.string().optional(),
      speechToText: z.boolean().optional(),
    }),
    // IMPORTANT: Include ONLY required parameters in the required array
    required: ["meetingUrl", "botName", "reserved"],
  },
  // ... other tools
};
```

## Integration with Next.js API Routes

```typescript
// app/api/chat/route.ts
import { toolsSchemas } from "@/lib/tools";
import { createMCPClient } from "ai";

export async function POST(request: Request) {
  // Set up MCP client
  const client = await createMCPClient({
    transport: {
      type: "sse",
      url: process.env.MEETING_BAAS_MCP_URL,
      headers: {
        "x-meeting-baas-api-key": process.env.MEETING_BAAS_API_KEY,
      },
    },
  });

  // Register tools
  const toolSet = await client.tools({ schemas: toolsSchemas });

  // Use tools in streaming response
  // ...
}
```

## Common Pitfalls to Avoid

1. **Schema Format**: The MCP client expects a specific format with `parameters` and `required` arrays
2. **Required Fields**: Only truly required parameters should be in the `required` array
3. **API Key**: Always ensure your API key is properly passed in the transport headers
4. **Caching**: Clear Next.js cache if schema changes aren't being picked up
5. **Import Paths**: Use the correct import path (`@meeting-baas/sdk/tools` for pre-built tools)

## Debugging Tips

- Log API key status (first few characters only) to verify authentication
- Check schema validation errors carefully - they usually point to specific schema formatting issues
- For SSE transport, ensure the MCP server URL is correct
- For Stdio transport, verify environment variables are passed correctly

By following these guidelines, you'll avoid the common schema validation errors and have a smoother integration experience with the Meeting BaaS SDK.
