'use client';

import cx from 'classnames';
import { motion } from 'framer-motion';
import { useState } from 'react';

// Type for tool categories
type ToolCategory = 'core' | 'speaking' | 'admin' | 'calendar' | 'other';

// Type for individual tool
interface Tool {
  name: string;
  description: string;
  category: ToolCategory;
}

// Define category colors and icons (simplified for now)
const categoryStyles: Record<ToolCategory, { bgColor: string; textColor: string; title: string }> = {
  core: {
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    title: 'Core Functions'
  },
  speaking: {
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    title: 'Speaking Bots'
  },
  admin: {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    title: 'Admin Tools'
  },
  calendar: {
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    title: 'Calendar Management'
  },
  other: {
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    title: 'Other Tools'
  }
};

// Function to categorize tools
function categorizeTools(tools: Tool[]): Record<ToolCategory, Tool[]> {
  const categories: Record<ToolCategory, Tool[]> = {
    core: [],
    speaking: [],
    admin: [],
    calendar: [],
    other: []
  };

  tools.forEach(tool => {
    categories[tool.category].push(tool);
  });

  return categories;
}

interface ToolsDisplayProps {
  tools: Tool[];
  onToolSelect?: (toolName: string) => void;
}

export function ToolsDisplay({ tools, onToolSelect }: ToolsDisplayProps) {
  const categorizedTools = categorizeTools(tools);
  const [expandedCategory, setExpandedCategory] = useState<ToolCategory | null>(null);

  const handleToolClick = (toolName: string) => {
    if (onToolSelect) {
      onToolSelect(toolName);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 w-full max-w-3xl mx-auto">
      {Object.entries(categorizedTools).map(([category, categoryTools]) => {
        if (categoryTools.length === 0) return null;
        
        const { bgColor, textColor, title } = categoryStyles[category as ToolCategory];
        const isExpanded = expandedCategory === category;
        
        return (
          <div key={category} className="w-full">
            <button 
              onClick={() => setExpandedCategory(isExpanded ? null : category as ToolCategory)}
              className={cx(
                'w-full rounded-lg p-3 text-left font-medium transition-all',
                bgColor,
                textColor
              )}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{title}</h3>
                <span className="text-sm">{categoryTools.length} tools</span>
              </div>
            </button>
            
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"
              >
                {categoryTools.map(tool => (
                  <button 
                    key={tool.name}
                    onClick={() => handleToolClick(tool.name)}
                    className={cx(
                      'p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow text-left',
                      bgColor.replace('100', '50'),
                      'hover:bg-opacity-80'
                    )}
                  >
                    <h4 className="font-semibold mb-1">{tool.name}</h4>
                    <p className="text-sm text-gray-700">{tool.description}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Demo function to parse tool list from AI response text
export function parseToolsFromText(text: string): Tool[] {
  // Simple regex to extract tool name and description
  const toolPattern = /(\d+\.\s+)?([\w]+):\s+(.*?)(?=\n\d+\.|$)/gs;
  const tools: Tool[] = [];
  
  let match;
  while ((match = toolPattern.exec(text)) !== null) {
    const name = match[2].trim();
    const description = match[3].trim();
    
    // Categorize based on tool name
    let category: ToolCategory = 'other';
    
    if (name.includes('join') || name.includes('leave')) {
      if (name.includes('Speaking')) {
        category = 'speaking';
      } else {
        category = 'core';
      }
    } else if (name.includes('Calendar') || name.includes('Event')) {
      category = 'calendar';
    } else if (name.includes('delete') || name.includes('logs') || name.includes('stripe')) {
      category = 'admin';
    } else if (name.includes('Meeting') || name.includes('Data') || name.includes('bot')) {
      category = 'core';
    }
    
    tools.push({
      name,
      description,
      category
    });
  }
  
  return tools;
}

// You could implement a custom tool function like this:
// export const listToolsCards = tool({
//   description: 'List available tools in a card layout',
//   parameters: z.object({}),
//   execute: async () => {
//     // Fetch available tools or parse from a list
//     return { component: 'ToolsDisplay' };
//   },
// }); 