const {
  allTools,
  registerTools: registerBaasTools,
} = require("@meeting-baas/sdk/tools");
import { z } from "zod";

// Define interfaces for tool and parameter to fix type errors
interface ToolParameter {
  name: string;
  schema: z.ZodType<any>;
  required: boolean;
}

interface Tool {
  name: string;
  parameters: ToolParameter[];
}

// Extract schemas from all Meeting BaaS tools
export const toolsSchemas = Object.fromEntries(
  (allTools as Tool[]).map((tool: Tool) => [
    // Convert from default_api_join to joinMeeting format
    tool.name.replace(/^default_api_/, "").replace(/_/g, ""),
    {
      parameters: z.object(
        Object.fromEntries(
          tool.parameters.map((param: ToolParameter) => [
            // Convert snake_case to camelCase for parameters
            param.name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
            param.schema
          ])
        )
      ),
      required: tool.parameters
        .filter((param: ToolParameter) => param.required)
        .map((param: ToolParameter) => param.name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()))
    }
  ])
);

// For debugging/visualization, log the available tools
console.log(`Loaded ${Object.keys(toolsSchemas).length} tools from Meeting BaaS SDK`);
