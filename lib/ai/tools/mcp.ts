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

// Function to safely transform tool names to match the required pattern
function transformToolName(name: string): string {
  // First, remove the "default_api_" prefix if it exists
  let transformedName = name.replace(/^default_api_/, "");

  // Now convert snake_case to camelCase
  transformedName = transformedName.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

  // Ensure the name only contains allowed characters (alphanumeric, underscores, hyphens)
  // Replace any other characters with underscores
  transformedName = transformedName.replace(/[^a-zA-Z0-9_-]/g, "_");

  return transformedName;
}

// Extract schemas from all Meeting BaaS tools
export const toolsSchemas = Object.fromEntries(
  (allTools as Tool[]).map((tool: Tool) => [
    // Use the safe transformation function for tool names
    transformToolName(tool.name),
    {
      parameters: z.object(
        Object.fromEntries(
          tool.parameters.map((param: ToolParameter) => [
            // Convert snake_case to camelCase for parameters, also ensuring valid names
            param.name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
              .replace(/[^a-zA-Z0-9_-]/g, "_"),
            param.schema
          ])
        )
      ),
      required: tool.parameters
        .filter((param: ToolParameter) => param.required)
        .map((param: ToolParameter) => param.name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
          .replace(/[^a-zA-Z0-9_-]/g, "_"))
    }
  ])
);

// Log available tools for debugging
console.log(`Loaded ${Object.keys(toolsSchemas).length} tools from Meeting BaaS SDK`);
// Log the transformed tool names to help with debugging
console.log(`Tool names: ${Object.keys(toolsSchemas).join(', ')}`);
