'use client';
import { ChevronUp } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { ThemeToggle } from "../theme-toggle";
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
    const response = await fetch('https://api.meetingbaas.com/accounts/api_key', {
      method: 'GET',
      credentials: 'include',  // This is critical for sending cookies cross-domain
      headers: {
        'Content-Type': 'application/json'
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
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
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
