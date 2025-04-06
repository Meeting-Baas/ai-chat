'use client';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { useEffect, useState } from 'react';

import { ModelSelector } from '@/components/chat/model-selector';
import { SidebarToggle } from '@/components/sidebar/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon, } from '../icons';
import { useSidebar } from '../ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import Link from 'next/link';
import { FishIcon, GithubIcon } from 'lucide-react';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Check API key status when component mounts
  useEffect(() => {
    // Use the existing route.ts GET handler that we added
    const checkApiKeyStatus = async () => {
      try {
        // Use the route.ts GET handler we already implemented
        const response = await fetch('/api/chat', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setHasApiKey(!!data.hasApiKey);
          console.log('API key status:', data.hasApiKey);
        } else {
          console.error('API key check failed:', response.status);
        }
      } catch (error) {
        console.error('Failed to check API key status:', error);
      }
    };
    
    checkApiKeyStatus();
  }, []);

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      <Button
        variant="outline"
        className="hidden md:flex py-1.5 px-2 h-fit md:h-[34px] order-4 md:ml-auto"
        asChild
      >
        <Link
          href="https://github.com/Meeting-Baas/ai-chat"
          target="_blank"
        >
          <span className="flex items-center gap-2">
            <GithubIcon />
            Star on GitHub
          </span>
        </Link>
      </Button>

      <Button
        variant="outline"
        className="hidden md:flex py-1.5 px-2 h-fit md:h-[34px] order-4 "
        asChild
      >
        <Link 
          href={hasApiKey 
            ? "https://meetingbaas.com/logs" 
            : "https://meetingbaas.com/"
          } 
          target="_blank"
        >
          <span className="flex items-center gap-2">
            <FishIcon />
            {hasApiKey 
              ? "Open MeetingBaas Logs" 
              : "Get MeetingBaas API Key"
            }
          </span>
        </Link>
      </Button>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
