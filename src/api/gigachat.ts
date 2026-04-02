import { Message } from '../types';

const GIGACHAT_API_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
const AUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';

let accessToken: string | null = null;
let tokenExpiry: number | null = null;

async function getAccessToken(): Promise<string> {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const clientId = import.meta.env.VITE_GIGACHAT_CLIENT_ID;
  const secret = import.meta.env.VITE_GIGACHAT_SECRET;

  if (!clientId || !secret) {
    throw new Error('GigaChat credentials not found in environment variables');
  }

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': crypto.randomUUID(),
      'Authorization': `Basic ${btoa(`${clientId}:${secret}`)}`,
    },
    body: 'scope=GIGACHAT_API_PERS',
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_at || 30 * 60 * 1000);
  
  return accessToken;
}

export async function sendMessageToGigaChat(
  messages: Message[],
  onChunk?: (chunk: string) => void
): Promise<string> {
  const token = await getAccessToken();

  const formattedMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  const requestBody = {
    model: 'GigaChat',
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 2000,
    stream: !!onChunk,
  };

  if (onChunk) {
    // Streaming mode
    const response = await fetch(GIGACHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                onChunk(fullContent);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    }
    
    return fullContent;
  } else {
    // Non-streaming mode
    const response = await fetch(GIGACHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}