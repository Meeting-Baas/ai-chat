'use server';
import 'server-only';
import { cookies } from 'next/headers';

const API_ENDPOINT = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001/accounts/api_key'
  : 'https://api.meetingbaas.com/accounts/api_key';

export async function auth() {
    console.log('=== MEETINGBAAS AUTH STARTED ===');
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

    console.log('Fetching API key from MeetingBaas API...');
    try {
        const response = await fetch(
            API_ENDPOINT,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `jwt=${jwt}`,
                },
            },
        );
        
        console.log(`API key fetch response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            console.log(`Failed to fetch API key: ${response.status} ${response.statusText}`);
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
        console.error('=== MEETINGBAAS AUTH ENDED WITH ERROR ===');
        return { jwt: null, apiKey: null };
    }
}
