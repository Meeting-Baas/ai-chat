import { tool } from 'ai';
import { z } from 'zod';

export const listToolsCards = tool({
  description: 'List available tools organized in Markdown categories',
  parameters: z.object({}),
  execute: async () => {
    // Define tools by category
    const coreTools = [
      { name: 'joinMeeting', description: 'Send an AI bot to join a video meeting for recording, transcription, and streaming.' },
      { name: 'leaveMeeting', description: 'Remove an AI bot from a meeting.' },
      { name: 'getMeetingData', description: 'Get data about a meeting that a bot has joined.' },
      { name: 'botsWithMetadata', description: 'Get a list of all bots with their metadata.' }
    ];
    
    const speakingTools = [
      { name: 'joinSpeakingMeeting', description: 'Send an AI speaking bot to join a video meeting with voice AI capabilities.' },
      { name: 'leaveSpeakingMeeting', description: 'Remove a speaking bot from a meeting by its ID.' }
    ];
    
    const calendarTools = [
      { name: 'createCalendar', description: 'Create a new calendar integration.' },
      { name: 'listCalendars', description: 'List all calendar integrations.' },
      { name: 'getCalendar', description: 'Get details about a specific calendar integration.' },
      { name: 'listEvents', description: 'List all scheduled events.' },
      { name: 'scheduleRecordEvent', description: 'Schedule a recording.' },
      { name: 'unscheduleRecordEvent', description: 'Cancel a scheduled recording.' },
      { name: 'updateCalendar', description: 'Update a calendar integration configuration.' }
    ];
    
    const adminTools = [
      { name: 'deleteData', description: 'Delete data associated with a meeting bot.' },
      { name: 'deleteCalendar', description: 'Delete a calendar integration.' },
      { name: 'stripeLink', description: 'Redirect users to the Meeting BaaS billing pages.' },
      { name: 'logsLink', description: 'Get logs for a specific bot session.' }
    ];

    // Format the tools in Markdown
    const markdown = `
# MeetingBaaS Tools

## Core Functions
${coreTools.map(tool => `- **${tool.name}**: ${tool.description}`).join('\n')}

## Speaking Bots
${speakingTools.map(tool => `- **${tool.name}**: ${tool.description}`).join('\n')}

## Calendar Management
${calendarTools.map(tool => `- **${tool.name}**: ${tool.description}`).join('\n')}

## Administration
${adminTools.map(tool => `- **${tool.name}**: ${tool.description}`).join('\n')}
`;

    return {
      text: markdown.trim()
    };
  },
}); 