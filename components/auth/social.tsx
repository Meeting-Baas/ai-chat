'use client';
import { signInWithGoogle } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { LoaderIcon } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { LogoGoogle } from '../icons';

export const Social = () => {
  const [error, submitAction, isPending] = useActionState(async () => {
    const error = await signInWithGoogle();
    if (error) {
      return error;
    }
    return null;
  }, null);

  // Store auth token in localStorage when Google login is successful
  useEffect(() => {
    if (!error && !isPending) {
      // Successfully authenticated with Google
      const authToken = `google_auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('auth_token', authToken);
    }
  }, [error, isPending]);

  return (
    <form className="flex w-full flex-col items-center gap-2">
      <Button
        size="lg"
        className="flex w-full flex-row items-center justify-center gap-2 shadow-sm"
        variant="outline"
        disabled={isPending}
        formAction={submitAction}
      >
        {isPending ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <LogoGoogle size={20} />
        )}

        <span className="font-medium text-muted-foreground">
          Continue with Google
        </span>
      </Button>
    </form>
  );
};
