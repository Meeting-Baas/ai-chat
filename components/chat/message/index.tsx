'use client';

import type { UIMessage } from 'ai';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import type { Vote } from '@/server/db/schema';
import { DocumentToolCall, DocumentToolResult } from '../../artifact/document/document';
import { PencilEditIcon, SparklesIcon, WarningIcon, CheckCircleFillIcon } from '../../icons';
import { Markdown } from '../../markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from '../preview-attachment';
import { Weather } from '../../tools/weather';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from '../../artifact/document/document-preview';
import { MessageReasoning } from './message-reasoning';
import type { UseChatHelpers } from '@ai-sdk/react';

const formatApiResponse = (text: string): React.ReactNode => {
  try {
    // Only try to parse if it looks like JSON (starts with { or [)
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      // Check if the text is valid JSON
      const parsed = JSON.parse(text);

      // Check if it's a simple message (especially errors)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        parsed.content?.length === 1 &&
        parsed.content[0]?.type === 'text'
      ) {
        // It's a simple message, return it as a friendly message component
        return (
          <MessageNotification
            type={parsed.isError ? 'error' : 'success'}
            message={parsed.content[0].text}
          />
        );
      }

      // For more complex responses, still format as code
      if (typeof parsed === 'object' && parsed !== null) {
        return (
          <div className="overflow-auto rounded-md bg-muted p-4">
            <pre className="text-sm">
              <code className="language-json">{JSON.stringify(parsed, null, 2)}</code>
            </pre>
          </div>
        );
      }
    }
    
    // If it doesn't look like JSON or couldn't be parsed as JSON with our expected format,
    // return null to fall back to Markdown
    return null;
  } catch (e) {
    // JSON parsing failed, return null to fall back to Markdown
    return null;
  }
};

const MessageNotification = ({ type, message }: { type: 'success' | 'error', message: string }) => {
  const icon = type === 'error'
    ? <WarningIcon size={16} />
    : <CheckCircleFillIcon size={16} />;

  // Special styling for API key messages
  const isApiKeyMessage = message.includes('API key received');
  
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-md bg-muted/50 w-fit",
      isApiKeyMessage && "bg-blue-100 dark:bg-blue-900/30"
    )}>
      <div className={
        type === 'error' 
          ? "text-red-600" 
          : isApiKeyMessage 
            ? "text-blue-600" 
            : "text-green-600"
      }>
        {icon}
      </div>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {message.experimental_attachments && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col gap-4', {
                          'bg-primary text-primary-foreground px-3 py-2 rounded-xl':
                            message.role === 'user',
                        })}
                      >
                        {message.role === 'assistant'
                          ? typeof part.text === 'string'
                            ? (formatApiResponse(part.text) || <Markdown>{part.text}</Markdown>)
                            : <Markdown>{part.text}</Markdown>
                          : <Markdown>{part.text}</Markdown>}
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-invocation') {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === 'call') {
                  const { args } = toolInvocation;

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ['getWeather'].includes(toolName),
                      })}
                    >
                      {toolName === 'getWeather' ? (
                        <Weather />
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolCall
                          type="update"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : null}
                    </div>
                  );
                }

                if (state === 'result') {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'getWeather' ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview
                          isReadonly={isReadonly}
                          result={result}
                        />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          isReadonly={isReadonly}
                        />
                      ) : (
                        <ApiCallDetails
                          toolName={toolName}
                          args={toolInvocation.args}
                          result={result}
                        />
                      )}
                    </div>
                  );
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': true,
          },
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Simplify to just show raw request and response as code blocks
const ApiCallDetails = ({
  toolName,
  args,
  result
}: {
  toolName: string;
  args: Record<string, any>;
  result: any;
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Check if it's a simple message response
  const isSimpleMessage = result?.content?.[0]?.text &&
    result?.content?.length === 1 &&
    result?.content[0]?.type === 'text';

  // Extract message if it's a simple format
  const message = isSimpleMessage ? result.content[0].text : null;
  const isError = result?.isError === true;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm">Tool: <code className="bg-muted px-1 py-0.5 rounded">{toolName}</code></span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {/* Simple message format when details are hidden */}
      {!showDetails && message && (
        <div className={`p-3 rounded-md ${isError ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"}`}>
          {message}
        </div>
      )}

      {/* JSON for complex responses when details are hidden */}
      {!showDetails && !message && (
        <div className="overflow-auto rounded-md bg-muted p-4">
          <pre className="text-sm">
            <code>{JSON.stringify(result, null, 2)}</code>
          </pre>
        </div>
      )}

      {/* Simple request and response code blocks when details are shown */}
      {showDetails && (
        <div className="space-y-3">
          {/* Request code block */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Request</div>
            <div className="overflow-auto rounded-md bg-muted p-3">
              <pre className="text-xs">
                <code>{JSON.stringify(args || {}, null, 2)}</code>
              </pre>
            </div>
          </div>

          {/* Response code block */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Response</div>
            <div className="overflow-auto rounded-md bg-muted p-3">
              <pre className="text-xs">
                <code>{JSON.stringify(result, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
