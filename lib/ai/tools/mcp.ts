import { z } from "zod";

// Define types for the SDK structures
interface ToolParameter {
  name: string;
  schema: z.ZodType<any>;
  required: boolean;
}

interface Tool {
  name: string;
  parameters: ToolParameter[];
}

// Import SDK components with type assertions
const {
  allTools,
  registerTools: registerBaasTools,
} = require("@meeting-baas/sdk/tools") as {
  allTools: Tool[];
  registerTools: (tools: Tool[], registerFn: (tool: Tool) => void) => void;
};

// Define type for schema object
interface SchemaDefinition {
  parameters: z.ZodObject<any>;
  required: string[];
}

// Export original tool names directly from SDK without any transformation
export const toolsSchemas: Record<string, SchemaDefinition> = {};

// Loop through all tools and use their original names
(allTools || []).forEach((tool: Tool) => {
  // Use the original name - DON'T sanitize it
  const originalName = tool.name;

  toolsSchemas[originalName] = {
    parameters: z.object(
      Object.fromEntries(
        (tool.parameters || []).map((param: ToolParameter) => [
          param.name,
          param.schema
        ])
      )
    ),
    required: (tool.parameters || [])
      .filter((param: ToolParameter) => param.required)
      .map((param: ToolParameter) => param.name)
  };
});

// Log tool info for debugging
console.log(`Using ${Object.keys(toolsSchemas).length} untransformed tools directly from SDK`);
console.log(`Original tool names: ${Object.keys(toolsSchemas).join(', ')}`);
