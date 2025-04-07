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

// Log the raw tools from SDK
console.log("=== RAW TOOLS FROM SDK ===");
console.log(`Number of tools from SDK: ${allTools?.length || 0}`);
if (allTools?.length > 0) {
  console.log("Sample tool structure:", {
    name: allTools[0].name,
    paramCount: allTools[0].parameters?.length || 0,
    paramNames: allTools[0].parameters?.map(p => p.name) || []
  });
}
console.log("=== END RAW TOOLS ===");

// Ensure we're using registerBaasTools from the SDK
registerBaasTools(allTools, (tool: Tool) => {
  const originalName = tool.name;
  const parameters = (tool.parameters || []);

  // Create zod object from parameters
  const paramEntries = parameters.map((param: ToolParameter) => [
    param.name,
    param.schema
  ]);

  // Get required parameters
  const requiredParams = parameters
    .filter((param: ToolParameter) => param.required)
    .map((param: ToolParameter) => param.name);

  // Create the schema with proper structure
  const schema = {
    parameters: z.object(Object.fromEntries(paramEntries)),
    required: requiredParams,
    name: originalName, // Add name to schema
    description: `Tool for ${originalName}` // Add description
  };

  toolsSchemas[originalName] = schema;

  // Log each tool's registration details
  console.log(`=== Tool Registration: ${originalName} ===`);
  console.log(`Parameters count: ${parameters.length}`);
  console.log(`Required parameters: ${requiredParams.length}`);
  console.log(`Parameter names: ${parameters.map(p => p.name).join(', ')}`);
  console.log(`Required parameter names: ${requiredParams.join(', ')}`);
  console.log(`Schema structure:`, {
    hasParameters: !!schema.parameters,
    hasRequired: Array.isArray(schema.required),
    requiredCount: schema.required.length
  });
  console.log(`=== End Tool Registration ===`);
});

// Log final tool schemas
console.log("=== FINAL TOOL SCHEMAS ===");
console.log(`Total tools registered: ${Object.keys(toolsSchemas).length}`);
console.log(`Tool names: ${Object.keys(toolsSchemas).join(', ')}`);
if (Object.keys(toolsSchemas).length > 0) {
  const sampleTool = Object.keys(toolsSchemas)[0];
  console.log(`Sample tool schema structure:`, {
    name: sampleTool,
    hasParameters: !!toolsSchemas[sampleTool].parameters,
    requiredCount: toolsSchemas[sampleTool].required.length
  });
}
console.log("=== END FINAL SCHEMAS ===");
