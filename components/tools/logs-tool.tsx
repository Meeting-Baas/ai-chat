'use client';

import { LoaderIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { CodeBlock } from '../artifact/code/code-block';
import { TextShimmer } from '../ui/text-shimmer';

interface LogsToolProps {
  result?: any;
  args?: any;
  isLoading?: boolean;
}

export function LogsTool({
  result,
  args,
  isLoading,
}: LogsToolProps) {
  // Only show expanded content if there's an error in the result
  const hasError = result?.error || (typeof result === 'string' && result.toLowerCase().includes('error'));
  const [isExpanded, setIsExpanded] = useState(hasError);
  
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

  // When loading, show the loading state
  if (isLoading) {
    return (
      <div className="flex flex-col">
        <div className="flex flex-row gap-2 items-center">
          <TextShimmer className="font-medium">Checking logs</TextShimmer>
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        </div>
      </div>
    );
  }

  // If successful (no error), just show minimal success message
  if (!hasError) {
    return (
      <div className="flex flex-col">
        <div className="flex flex-row gap-2 items-center">
          <div className="font-medium text-muted-foreground">Logs checked successfully</div>
        </div>
      </div>
    );
  }

  // If there's an error, show the error details
  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-2 items-center">
        <div className="font-medium text-destructive">Error retrieving logs</div>
        <button
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

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={variants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            className="pl-4 border-l flex flex-col gap-4"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Error Details</h3>
                <CodeBlock
                  node={{
                    type: 'code',
                    value: JSON.stringify(result, null, 2),
                  }}
                  inline={false}
                  className="text-xs"
                >
                  {result
                    ? JSON.stringify(result, null, 2)
                    : 'No error details available'}
                </CodeBlock>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 