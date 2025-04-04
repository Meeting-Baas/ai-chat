import type { Metadata } from 'next';
// import { Chat } from '@/components/icons';

import { CardWrapper } from '@/components/auth/card-wrapper';
import { RegisterForm } from '@/components/auth/register-form';
import { MagicLinkForm } from '@/components/auth/magic-form';
import { MessageSquare } from 'lucide-react';
import { abstractImages } from '@/lib/images';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Register to Chatbot',
};

export default function RegisterPage() {
  const image =
    abstractImages[Math.floor(Math.random() * abstractImages.length)];

  return (
    <>
      <div className="container relative grid h-dvh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full rounded-3xl overflow-hidden lg:block p-4">
          {/* todo: use next-image optimizations and limit urls available in next config */}
          <img
            src={image.url}
            className="object-cover w-full h-full rounded-3xl"
            alt="Abstract background"
          />
          <div className="absolute bottom-6 left-7 text-primary-foreground">
            <p>
              Credit:{' '}
              <a href={image.author.url} className="underline">
                {image.author.name}
              </a>
            </p>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <div className="flex items-center gap-2 justify-center">
                <div className="rounded-lg p-2 text-primary-foreground bg-zinc-900">
                  <MessageSquare className="size-6" />
                </div>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Create an account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to create your account
              </p>
            </div>
            <CardWrapper
              backButtonLabel="Already have an account?"
              backButtonLinkLabel="Login"
              backButtonHref="/login"
              showSocial
              showMagicLink
              showCredentials={process.env.NODE_ENV === 'development'}
            >
              <RegisterForm />
            </CardWrapper>
          </div>
        </div>
      </div>
    </>
  );
}
