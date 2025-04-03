'use client';
import { GitIcon } from '@/components/icons';
import { ChevronUp } from 'lucide-react';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from "../theme-toggle";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

// Function to fetch API key from the MeetingBaaS API
async function getApiKey() {
  try {
    // Check if user is authenticated by verifying auth token exists
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      toast.error('You must be logged in to access your API key');
      return null;
    }

    // Determine API URL based on the environment
    let apiUrl;
    if (typeof window !== 'undefined') {
      // Check if we're in pre-production based on the hostname
      const isPreprod = window.location.hostname.includes('pre-prod');

      if (process.env.NODE_ENV === 'development') {
        // Local development environment
        apiUrl = process.env.NEXT_PUBLIC_DEV_API_URL + '/accounts/api_key';
      } else if (isPreprod) {
        // Pre-production environment
        apiUrl = process.env.NEXT_PUBLIC_MEETINGBAAS_PRE_PROD_API_URL + '/accounts/api_key';
      } else {
        // Production environment
        apiUrl = process.env.NEXT_PUBLIC_MEETINGBAAS_API_URL + '/accounts/api_key';
      }
    }

    if (!apiUrl) {
      throw new Error('API URL is not defined');
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',  // This is critical for sending cookies cross-domain
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (response.ok) {
      return response.json().then(data => {
        console.log('API Key:', data.api_key);
        return data.api_key;
      });
    } else {
      throw new Error(`Failed to fetch API key: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error fetching API key:', error);
    toast.error('Failed to fetch API key. Please ensure you are logged in.');
    return null;
  }
}

export function SidebarUserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch API key after component mounts (after successful login)
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        // Check if user is authenticated by verifying auth token exists
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
          toast.warning('Please log in to access your MeetingBaaS API key');
          return;
        }

        const key = await getApiKey();
        if (key) {
          setApiKey(key);
          // Store API key in localStorage for use in other components
          localStorage.setItem('meetingbaas_api_key', key);
          toast.success('Successfully connected to MeetingBaaS');
        } else {
          // If key is null but no error was thrown, show a message
          toast.warning('Could not retrieve MeetingBaaS API key');
        }
      } catch (error) {
        console.error('API Key fetch error in useEffect:', error);
      }
    };

    // Only fetch if user is authenticated
    if (user?.email) {
      fetchApiKey();
    }
  }, [user?.email]); // Re-run if user email changes

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10">
              <Image
                src={`https://avatar.vercel.sh/${user.email}`}
                alt={user.email ?? 'User Avatar'}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="truncate">{user?.email}</span>
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem
              className="inline-flex justify-between w-full hover:!bg-background py-1"
              onSelect={(e) => {
                e.preventDefault();
              }}
            >
              <p>Theme</p>
              <ThemeToggle mode='light-dark-system' />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href="https://github.com/Meeting-Baas/ai-chat"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 w-full cursor-pointer"
              >
                <GitIcon />
                <span>GitHub</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  // Clear auth tokens from localStorage before signing out
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('meetingbaas_api_key');

                  signOut({
                    redirectTo: '/',
                  });
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
