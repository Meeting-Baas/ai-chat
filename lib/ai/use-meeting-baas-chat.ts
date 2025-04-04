import { type Message } from 'ai';
import { useCallback, useEffect, useState } from 'react';
import { createAiSdkEngine } from './ai-sdk';

// This is a simplified version that adapts your custom engine to match useChat's interface
export function useMeetingBaasChat({ id, initialMessages = [] }: { id?: string, initialMessages?: Message[] } = {}) {
  // State for the engine (initially null until initialized)
  const [engine, setEngine] = useState<any>(null); // Fix TypeScript error with 'any' for now
  const [isEngineLoading, setIsEngineLoading] = useState(true);
  
  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'submitted'>('idle');
  const [data, setData] = useState<any[]>([]);
  
  // Initialize the engine on mount
  useEffect(() => {
    let isMounted = true;
    
    const initEngine = async () => {
      setIsEngineLoading(true);
      try {
        // Log localStorage contents for debugging
        if (typeof window !== 'undefined') {
          console.log('All localStorage keys:', Object.keys(localStorage));
          console.log('API key in localStorage:', 
            localStorage.getItem('meetingbaas_api_key') ? 'exists' : 'missing',
            'auth_token in localStorage:', 
            localStorage.getItem('auth_token') ? 'exists' : 'missing'
          );
          
          // Force set API key for testing if it's missing
          const apiKey = localStorage.getItem('meetingbaas_api_key') || localStorage.getItem('auth_token');
          if (!apiKey) {
            console.warn('No API key found in localStorage, please set one with: window.setMeetingBaasApiKey("your-api-key")');
          }
        }
        
        const engineInstance = await createAiSdkEngine();
        if (isMounted) setEngine(engineInstance);
      } catch (error) {
        console.error('Failed to initialize chat engine:', error);
      } finally {
        if (isMounted) setIsEngineLoading(false);
      }
    };
    
    initEngine();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Input handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);
  
  // Submit handler with extra debugging
  const handleSubmit = useCallback(async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    
    if (!input.trim()) {
      console.log('Input is empty, not submitting');
      return;
    }
    
    if (!engine) {
      console.log('Engine not initialized yet, cannot submit');
      return;
    }
    
    // Debug API key again right before sending
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('meetingbaas_api_key') || localStorage.getItem('auth_token');
      console.log('API key before submit:', apiKey ? `exists (${apiKey.length} chars)` : 'missing');
    }
    
    setStatus('submitted');
    
    try {
      console.log('Calling engine.prompt with input:', input.slice(0, 20) + '...');
      await engine.prompt(
        input,
        (update: string) => {
          setStatus('streaming');
          console.log('Received update:', update.slice(0, 20) + '...');
          setData(prev => [...prev, { type: 'text-delta', content: update }]);
        },
        (final: string) => {
          setStatus('idle');
          console.log('Received final response');
          setData(prev => [...prev, { type: 'finish', content: '' }]);
        }
      );
      
      console.log('Engine.prompt completed, getting history');
      const history = engine.getHistory();
      setMessages(history.map((msg: any, i: number) => ({
        id: `msg-${i}`,
        role: msg.role,
        content: msg.content
      })));
      
      setInput('');
    } catch (error) {
      console.error('Error in chat:', error);
      setStatus('idle');
    }
  }, [input, engine]);
  
  // Add reload and append methods to match useChat interface
  const reload = useCallback(() => {
    console.log('Reload method called (not implemented)');
  }, []);

  const append = useCallback((message: Message) => {
    console.log('Append method called (not implemented)', message);
  }, []);
  
  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    setInput,
    data,
    isLoading: isEngineLoading,
    reload,
    append,
  };
} 