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
      credentials: 'include',  // Important: sends cookies with the request
    });

    if (response.ok) {
      const data = await response.json();
      return data.api_key;  // Return the API key
    } else {
      console.error('Error fetching API key:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error fetching API key:', error);
    return null;
  }
}

export function SidebarUserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch API key after component mounts (after successful login)
  useEffect(() => {
    const fetchApiKey = async () => {
      const key = await getApiKey();
      if (key) {
        setApiKey(key);
        // Store API key in localStorage for use in other components
        localStorage.setItem('meetingbaas_api_key', key);
      }
    };

    fetchApiKey();
  }, []);

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
