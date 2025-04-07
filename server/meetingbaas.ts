'use server';
import { cookies } from 'next/headers';
import 'server-only';

// Enhanced endpoint selection with detailed logging
const API_ENDPOINT = (process.env.NODE_ENV as string) === 'development'
    ? `${process.env.NEXT_PUBLIC_DEV_API_URL || 'http://localhost:3001'}/accounts/api_key`
    : `${process.env.NEXT_PUBLIC_MEETINGBAAS_API_URL || 'https://api.meetingbaas.com'}/accounts/api_key`;

export async function auth() {
    console.log('=== MEETINGBAAS AUTH STARTED ===');
    console.log(`Current environment: ${process.env.NODE_ENV}`);
    console.log(`Using API endpoint: ${API_ENDPOINT}`);

    const cookieStore = await cookies();
    const jwt = cookieStore.get('jwt')?.value;

    // Log JWT status but not the full value for security
    console.log(`JWT present: ${jwt ? 'Yes' : 'No'}`);
    if (jwt) {
        console.log(`JWT length: ${jwt.length}`);
        console.log(`JWT starts with: ${jwt.substring(0, 8)}...`);
    }

    if (!jwt) {
        console.log('No JWT found in cookies, returning null');
        console.log('=== MEETINGBAAS AUTH ENDED ===');
        return null;
    }

    // Local development fallback
    if ((process.env.NODE_ENV as string) === 'development') {
        // Use BAAS_API_KEY from environment if available, otherwise use fallback
        const envApiKey = process.env.BAAS_API_KEY || 'dev-fallback-key';
        console.log(`Using environment API key: ${envApiKey.substring(0, 4)}***`);
        return { jwt, apiKey: envApiKey };
    }

    console.log('Fetching API key from MeetingBaas API...');
    try {
        console.log(`Fetch request to: ${API_ENDPOINT}`);
        console.log(`With JWT cookie (first 8 chars): ${jwt.substring(0, 8)}...`);

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
            API_ENDPOINT,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `jwt=${jwt}`,
                },
                signal: controller.signal
            },
        );

        clearTimeout(timeoutId);
        console.log(`API key fetch response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.log(`Failed to fetch API key: ${response.status} ${response.statusText}`);

            // In development, provide a fallback key if fetch fails
            if ((process.env.NODE_ENV as string) === 'development') {
                console.log('Using development fallback API key after fetch failure');
                return { jwt, apiKey: 'tesban' };
            }

            console.log('=== MEETINGBAAS AUTH ENDED ===');
            return { jwt: null, apiKey: null };
        }

        const data = await response.json() as {
            api_key?: string;
        };

        console.log(`API key received: ${data?.api_key ? 'Yes' : 'No'}`);
        if (data?.api_key) {
            console.log(`API key length: ${data.api_key.length}`);
            console.log(`API key starts with: ${data.api_key.substring(0, 4)}***`);
        }

        const result = { jwt, apiKey: data?.api_key ?? null };
        console.log(`Returning result with API key: ${result.apiKey ? 'Present' : 'Null'}`);
        console.log('=== MEETINGBAAS AUTH ENDED ===');
        return result;
    } catch (error) {
        console.error('=== MEETINGBAAS AUTH ERROR ===');
        console.error(`Error fetching API key: ${error instanceof Error ? error.message : String(error)}`);

        // Provide more detailed error information
        if (error instanceof Error) {
            console.error(`Error name: ${error.name}`);
            console.error(`Error stack: ${error.stack?.split('\n')[0] || 'No stack'}`);

            // Check for specific network errors
            if (error.name === 'AbortError') {
                console.error('Request timed out after 5 seconds');
            } else if (error.message.includes('ECONNREFUSED')) {
                console.error('Connection refused - is the local server running?');
            }
        }

        // In development, provide a fallback key
        if ((process.env.NODE_ENV as string) === 'development') {
            console.log('Using development fallback API key after error');
            return { jwt, apiKey: 'error-fallback-key' };
        }

        console.error('=== MEETINGBAAS AUTH ENDED WITH ERROR ===');
        return { jwt: null, apiKey: null };
    }
}
