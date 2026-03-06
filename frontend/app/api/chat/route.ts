import { google } from '@ai-sdk/google';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

import { getMhirjContext } from '@/lib/ai-context';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: getMhirjContext(),
    messages: await convertToModelMessages(messages),
    temperature: 0.2,
    maxOutputTokens: 600,
  });

  return result.toUIMessageStreamResponse();
}