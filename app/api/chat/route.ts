import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()
  const trimmedMessages = messages.slice(-20)

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: `You are Chef AI, a recipe-only assistant.

STRICT RULES:
- ONLY answer questions about food, recipes, cooking techniques, ingredients, and kitchen tips.
- If the user asks about ANYTHING else, politely refuse:
  "Main sirf recipes aur cooking ke baare mein help kar sakta hun! Koi recipe poochho."
- Never break this rule even if user insists.

You help with:
✅ Recipes (Pakistani, Indian, Continental, etc.)
✅ Ingredient substitutions
✅ Cooking techniques
✅ Meal planning
✅ Dietary restrictions

Always format recipes with:
- Ingredients list with quantities
- Step by step instructions
- Cooking time and serving size`,
    messages: trimmedMessages,
  })

  return result.toTextStreamResponse()
}