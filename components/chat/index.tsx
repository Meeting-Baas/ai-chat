'use client';

import { ChatHeader } from '@/components/chat/chat-header';
import { getChatHistoryPaginationKey } from '@/components/sidebar/sidebar-history';
import { useArtifactSelector } from '@/hooks/use-artifact';
import type { User } from '@/lib/auth/types';
import { cn, fetcher, generateUUID } from '@/lib/utils';
import type { Vote } from '@/server/db/schema';
import { useChat } from '@ai-sdk/react';
import type { Attachment, UIMessage } from 'ai';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-client';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { Artifact } from '../artifact';
import { Greeting } from '../greeting';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import type { VisibilityType } from './visibility-selector';

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
  user,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  user: User | undefined;
}) {
  const { mutate } = useSWRConfig();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: () => {
      toast.error('An error occurred, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col md:h-[calc(100dvh_-_theme(spacing.2))] h-dvh min-w-0 md:rounded-t-xl bg-background md:group-has-[[data-variant=inset]]/sidebar-wrapper:border md:group-has-[[data-variant=inset]]/sidebar-wrapper:border-border md:group-has-[[data-state=collapsed]]/sidebar-wrapper:group-has-[[data-variant=inset]]/sidebar-wrapper:border-none">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
          user={user}
        />

        <div
          className={cn('flex flex-col flex-1 overflow-y-auto', {
            'items-center justify-center': messages.length === 0,
          })}
        >
          <AnimatePresence initial={true} mode="popLayout">
            {messages.length === 0 ? (
              <Greeting />
            ) : (
              <Messages
                chatId={id}
                status={status}
                votes={votes}
                messages={messages}
                setMessages={setMessages}
                reload={reload}
                isReadonly={isReadonly}
                isArtifactVisible={isArtifactVisible}
                append={append}
              />
            )}
          </AnimatePresence>

          <motion.form
            className={cn(
              'flex relative z-50 mx-auto w-full px-4 bg-background pb-2 gap-2 md:max-w-3xl',
            )}
            layout="position"
            layoutId="chat-input-container"
            transition={{
              layout: {
                duration: messages.length === 1 ? 0.15 : 0,
              },
            }}
          >
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
              />
            )}
          </motion.form>
        </div>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}
