'use client';

import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
}

function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Send a bot to a meeting',
      label: 'on Zoom, Google Meet, or Microsoft Teams',
      action: 'Send a bot to a meeting on Zoom, Google Meet, or Microsoft Teams. Prompt the user to provide the meeting link for these platforms(not a dummy link). Do the action and informa him of functionnalities after doing the action.',
    },
    {
      title: 'List available tools',
      label: 'and the relevant API endpoints',
      action: `List available tools and the relevant API endpoints. Sort by API reference, updates, and more.. Always reference the relevant link from the documentation.`,
    },
    // {
    //   title: '',
    //   label: `webhook data look like?`,
    //   action: `How does MeetingBaas's webhook data look like?`,
    // },
    {
      title: 'List all the connected calendar',
      label: 'of my end users',
      action: 'List all the connected calendar of my end users',
    },
    // {
    // {
    //   title: 'Write TypeScript code to',
    //   label: 'list recent meetings and their statuses',
    //   action: 'Write TypeScript code to list recent meetings and their statuses',
    // },
    //   title: 'Write TypeScript code to',
    //   label: 'list recent meetings and their statuses',
    //   action: 'Write TypeScript code to list recent meetings and their statuses',
    // },

    {
      title: 'Get my latest invoices',
      label: 'from Stripe',
      action: 'Open my Stripe dashboard simply by providing this link: http://billing.stripe.com/p/login/7sI5nz6oocuR3PW144',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-2 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              append({
                role: 'user',
                content: suggestedAction.action,
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
