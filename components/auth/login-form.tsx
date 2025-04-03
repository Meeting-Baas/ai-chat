'use client';

import { useAction } from 'next-safe-action/hooks';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { MagicLink } from '@/lib/validators';
import { MagicLinkSchema } from '@/lib/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { CheckCircleFillIcon as IconCheckCircle } from '@/components/icons';
import { TriangleAlertIcon as IconWarning } from 'lucide-react';
import { Alert, AlertTitle } from '../ui/alert';

import { loginWithMagicLink } from '@/app/(auth)/actions';
import { LoaderIcon } from 'lucide-react';

export const LoginForm = () => {
  const form = useForm({
    resolver: zodResolver(MagicLinkSchema),
    defaultValues: {
      email: '',
    },
  });

  const { execute, result, status } = useAction(loginWithMagicLink);

  const onSubmit = (values: MagicLink) => {
    execute(values);
  };

  // Effect to store auth token when login is successful
  useEffect(() => {
    if (status === 'hasSucceeded') {
      // Create a session token when login is successful
      const tempToken = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('auth_token', tempToken);
    }
  }, [status]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    disabled={status === 'executing'}
                    placeholder="Email address"
                    type="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {status === 'hasSucceeded' && (
          <Alert className="bg-emerald-500/15 text-emerald-500 p-3 border-emerald-500/15">
            <IconCheckCircle size={16} />
            <AlertTitle className='mb-0 leading-normal'>Confirmation email has been sent!</AlertTitle>
          </Alert>
        )}
        {result.serverError && (
          <Alert className="bg-destructive/15 text-destructive dark:bg-destructive dark:text-destructive-foreground p-3 border-destructive/15 dark:border-destructive">
            <IconWarning className='size-4' />
            <AlertTitle className='mb-0 leading-normal'>{result.serverError}</AlertTitle>
          </Alert>
        )}

        <Button
          disabled={status === 'executing'}
          type="submit"
          className="w-full"
        >
          {status === 'executing' && (
            <LoaderIcon className="mr-2 size-4 animate-spin" />
          )}
          Continue with Email
        </Button>
      </form>
    </Form>
  );
};

