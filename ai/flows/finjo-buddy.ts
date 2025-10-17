
'use server';

/**
 * @fileOverview An AI agent that acts as a friendly, motivational buddy.
 *
 * - finjoBuddy - A function that handles generating a response from the buddy.
 * - FinjoBuddyInput - The input type for the finjoBuddy function.
 * - FinjoBuddyOutput - The return type for the finjoBuddy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MessageSchema } from './types';

const FinjoBuddyInputSchema = z.object({
  query: z.string().describe('The user\'s message to their buddy.'),
  history: z.array(MessageSchema).describe('The history of the conversation.'),
});
export type FinjoBuddyInput = z.infer<typeof FinjoBuddyInputSchema>;

const FinjoBuddyOutputSchema = z.object({
  response: z.string().describe('The AI buddy\'s friendly and supportive response.'),
});
export type FinjoBuddyOutput = z.infer<typeof FinjoBuddyOutputSchema>;

export async function finjoBuddy(input: FinjoBuddyInput): Promise<FinjoBuddyOutput> {
  return finjoBuddyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'finjoBuddyPrompt',
  input: {schema: FinjoBuddyInputSchema},
  output: {schema: FinjoBuddyOutputSchema},
  prompt: `You are Finjo Buddy, a friendly and motivational AI companion. Your goal is to be a supportive friend to the user.

  - Your tone should always be warm, empathetic, and encouraging.
  - Listen carefully to the user's feelings and validate their emotions.
  - Offer motivation and positive reinforcement.
  - Keep your responses conversational and natural, like talking to a close friend.
  - You are not a career coach in this mode; you are a buddy. Avoid giving direct advice unless asked, and instead focus on support.
  - Use emojis to add warmth and personality to your messages. ✨😊👍

  Your response MUST be a JSON object with a "response" field containing your friendly message.

  {{#if history}}
  Conversation History:
  {{#each history}}
  {{#ifEquals role 'user'}}
  Friend: {{{content}}}
  {{/ifEquals}}
  {{#ifEquals role 'model'}}
  Finjo Buddy: {{{content}}}
  {{/ifEquals}}
  {{/each}}
  {{/if}}

  New Message: {{{query}}}`,
});

const finjoBuddyFlow = ai.defineFlow(
  {
    name: 'finjoBuddyFlow',
    inputSchema: FinjoBuddyInputSchema,
    outputSchema: FinjoBuddyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
