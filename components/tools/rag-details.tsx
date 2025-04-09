'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderIcon } from '@/components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';
import { useChat } from '@ai-sdk/react';
import type { DataStreamDelta } from '../data-stream-handler';

interface RAGDetailsProps {
  isLoading?: boolean;
  result?: RAGDetailsState | null;
  args?: any;
  chatId: string;
}

interface RAGDetailsState {
  content: string;
  status: 'streaming' | 'idle';
}

export function RAGDetails({
  isLoading,
  result,
  args,
  chatId,
}: RAGDetailsProps) {
  const { data: dataStream } = useChat({ id: chatId });
  const [isExpanded, setIsExpanded] = useState(isLoading);
  const [ragDetails, setRagDetails] = useState<RAGDetailsState | null>(result ?? null);

  const lastProcessedIndex = useRef(-1);
  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '1rem',
      marginBottom: '0.5rem',
    },
  };

  useEffect(() => {
    if (!dataStream?.length) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    (newDeltas as DataStreamDelta[]).forEach((delta: DataStreamDelta) => {
      setRagDetails((draftArtifact) => {
        if (!draftArtifact) {
          return { content: '', status: 'streaming' };
        }

        switch (delta.type) {
          case 'information-delta':
            return {
              ...draftArtifact,
              content: draftArtifact.content + delta.content,
              status: 'streaming',
            };
            
          case 'clear':
            return {
              ...draftArtifact,
              content: '',
              status: 'streaming',
            };

          case 'finish':
            return {
              ...draftArtifact,
              status: 'idle',
            };

          default:
            return draftArtifact;
        }
      });
    });
  }, [dataStream]);

  return (
    <div className="flex flex-col">
      {isLoading ? (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium">Getting information...</div>
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        </div>
      ) : (
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium">Got information</div>
          <button
            data-testid="message-rag-toggle"
            type="button"
            className="cursor-pointer"
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
          >
            <ChevronDown
              className={cn(
                {
                  'rotate-180': isExpanded,
                },
                'size-4',
              )}
            />
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            data-testid="message-rag"
            key="content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="pl-4 border-l flex flex-col gap-4"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-lg font-medium">Question</div>
                <p className="text-muted-foreground">{args?.question}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-lg font-medium">Results</div>
                {isLoading && (
                  <span className="text-muted-foreground">Thinking...</span>
                )}
                <Markdown>{ragDetails?.content}</Markdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
