import { processChatResponse } from '@/lib/ai/process-chat-response';
import { generateId, type Message, type ToolCall } from 'ai';

// Add this at the top of the file (after your imports)
declare global {
  interface Window {
    setMeetingBaasApiKey: (key: string) => void;
  }
}

// Define the interfaces based on your context provider rather than importing from fumadocs
export interface MessageRecord {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  references?: MessageReference[];
}

export interface MessageReference {
  breadcrumbs?: string[];
  title: string;
  description?: string;
  url: string;
}

// TODO: Decide the best method for handling API key input and storage:
// Option 1: Use the `getApiKey` tool call to prompt the user for their API key. (similar to generative ui)
// - This shows a UI for input, writes the key to localStorage, and appends a message to the chat history.
// - However, the tool call itself returns a blank response like "getting key", which doesn't make much sense semantically.
// - This seems like the better option because it's a one-shot flow that's more user-friendly and doesn't require the client to handle the key. But, as we can't use react components in the AI engine, it'll be a bit more complex to implement.
//
// Option 2: Use the `setApiKey` tool call to set the API key directly from the engine.
// - The AI asks the user for the API key, then checks for the tool call on the client side to set it in localStorage.
// - This feels messier: it's an extra tool call that just says "setting key" on the server, but the client handles it by checking for this tool call and then saving the key.
// - It's not really a one-shot flow and feels kind of lazy or clunky.
// 
// Figure out which method is more reliable, clean, and user-friendly in the context of the current architecture.
// UPDATE: I'm going with option 2 for now, as it's simpler to implement and doesn't require any UI components in the AI engine.
// If we need to change this later, we can refactor it to use the `getApiKey` tool call instead.

// Updated implementation to match the Engine interface from your AIProvider
export async function createAiSdkEngine() {
  let messages: Message[] = [];
  let controller: AbortController | null = null;
  let apiKey: string | null = null;

  async function fetchStream(
    userMessages: Message[],
    onUpdate?: (full: string) => void,
    onEnd?: (full: string) => void,
  ) {
    // Safe check for localStorage
    if (typeof window !== 'undefined') {
      apiKey = localStorage.getItem('meetingbaas_api_key') || localStorage.getItem('auth_token');
      console.log('API key status:', {
        exists: !!apiKey,
        length: apiKey?.length || 0,
        type: typeof apiKey,
        isEmpty: apiKey === ''
      });
    } else {
      apiKey = null;
      console.log('Window object not available (server-side rendering)');
    }
    
    controller = new AbortController();

    // Enhanced validation for API key
    if (!apiKey || apiKey.trim() === '') {
      const errorMessage = 'Please set your MeetingBaaS API key first';
      console.error('No valid API key found in localStorage');
      if (onEnd) onEnd(errorMessage);
      return errorMessage;
    }

    try {
      // Add this debug check right before the fetch call
      console.log('About to make API request with payload:', {
        messageCount: userMessages.length,
        apiKeyExists: !!apiKey,
        apiKeyLength: apiKey?.length || 0
      });
      
      // Create the payload separately for debugging
      const payload = {
        messages: userMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        apiKey: apiKey,
      };
      
      console.log('Full payload structure:', JSON.stringify(payload, null, 2));
      
      console.log('Sending chat request to API endpoint with API key length:', apiKey.length);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error: ${response.status}`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      let textContent = '';

      const onToolCall = async (props: { toolCall: ToolCall<string, unknown> }) => {
        const { toolCall: tool } = props;
        if (tool.toolName === 'setApiKey') {
          const parameters = tool.args as { apiKey: string };
          apiKey = parameters?.apiKey;

          // Changed to match your sidebar-user-nav.tsx implementation
          localStorage.setItem('meetingbaas_api_key', apiKey);
        }
      };

      if (response.body) {
        await processChatResponse({
          stream: response.body,
          update: (chunk) => {
            textContent = chunk.message.content;
            onUpdate?.(textContent);
          },
          lastMessage: {
            ...messages[messages.length - 1],
            parts: []
          },
          onToolCall: onToolCall,
          onFinish({ message, finishReason }) {
            onEnd?.(message?.content || '');
          },
          generateId,
        });
      } else {
        throw new Error('Response body is null');
      }

      return textContent;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error in AI stream:', error);
        const errorMessage =
          'Sorry, an error occurred while generating a response.';
        onEnd?.(errorMessage);
        return errorMessage;
      }
      return '';
    }
  }

  // Return object structure that matches the Engine interface from your context
  return {
    async prompt(
      text: string,
      onUpdate?: (full: string) => void,
      onEnd?: (full: string) => void
    ): Promise<void> {
      messages.push({
        id: generateId(),
        role: 'user',
        content: text,
      });

      const response = await fetchStream(messages, onUpdate, onEnd);
      messages.push({
        id: generateId(),
        role: 'assistant',
        content: response,
      });
    },
    async regenerateLast(
      onUpdate?: (full: string) => void,
      onEnd?: (full: string) => void
    ): Promise<void> {
      const last = messages.at(-1);
      if (!last || last.role === 'user') {
        return;
      }

      messages.pop();

      const response = await fetchStream(messages, onUpdate, onEnd);
      messages.push({
        id: generateId(),
        role: 'assistant',
        content: response,
      });
    },
    getHistory(): MessageRecord[] {
      // Convert the message format to match your MessageRecord interface
      return messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
    },
    clearHistory(): void {
      messages = [];
    },
    abortAnswer(): void {
      controller?.abort();
    },
  };
}

// // Debug function you can call from browser console
if (typeof window !== 'undefined') {
  // Make sure we're in browser environment
  window.setMeetingBaasApiKey = (key: string) => {
    localStorage.setItem('meetingbaas_api_key', key);
    console.log('API key set:', key);
  };
  
  // Add debug logging
  console.log('AI SDK initialized');
  console.log('Auth token in localStorage:', localStorage.getItem('auth_token'));
  console.log('API key in localStorage:', localStorage.getItem('meetingbaas_api_key'));
}
