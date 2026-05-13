import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const trimmedMessages = messages.slice(-20);

  const result = await streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `You are a friendly and expert recipe assistant named "Chef AI". 
    Help users find recipes, suggest ingredients, explain cooking techniques, 
    and adapt recipes to dietary restrictions.
    Format recipes clearly with ingredients list, step by step instructions, cooking time and serving size.`,
    messages: trimmedMessages,
  });

  return result.toTextStreamResponse();
}