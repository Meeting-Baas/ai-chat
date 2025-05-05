import { tool } from 'ai';
import { z } from 'zod';

export const botsWithMetadata = tool({
  description: 'Get a list of all bots with their metadata displayed in a spreadsheet',
  parameters: z.object({}),
  execute: async () => {
    // Mock data to demonstrate the spreadsheet functionality
    const mockBotsData = [
      {
        id: '123456',
        bot_name: 'FunnyBot',
        status: 'completed',
        created_at: '2023-04-23T15:30:00Z',
        meeting_url: 'https://meet.google.com/abc-defg-hij',
        duration: '2 minutes 19 seconds',
        speakers: 'Lazare Rossillon'
      },
      {
        id: '789012',
        bot_name: 'MeetingBaaS Bot',
        status: 'completed',
        created_at: '2023-04-23T15:35:00Z',
        meeting_url: 'https://meet.google.com/klm-nopq-rst',
        duration: '1 minute',
        speakers: ''
      }
    ];
    
    return {
      text: "Here's a spreadsheet view of all your Meeting BaaS bots:",
      component: 'BotsMetadataSheet',
      botsData: mockBotsData
    };
  },
}); 