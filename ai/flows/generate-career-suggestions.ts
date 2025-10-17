
'use server';

/**
 * @fileOverview An AI agent to generate career suggestions for students.
 *
 * - generateCareerSuggestions - A function that handles the generation of career suggestions.
 * - GenerateCareerSuggestionsInput - The input type for the generateCareerSuggestions function.
 * - GenerateCareerSuggestionsOutput - The return type for the generateCareerSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MessageSchema } from './types';
import { search } from '../tools/search';

const GenerateCareerSuggestionsInputSchema = z.object({
  query: z.string().describe('The career-related question or information provided by the student.'),
  history: z.array(MessageSchema).describe('The history of the conversation.'),
});
export type GenerateCareerSuggestionsInput = z.infer<typeof GenerateCareerSuggestionsInputSchema>;

const GenerateCareerSuggestionsOutputSchema = z.object({
  suggestion: z.string().describe('The AI-generated career suggestion. This should be a helpful and relevant response to the student\'s query.'),
});
export type GenerateCareerSuggestionsOutput = z.infer<typeof GenerateCareerSuggestionsOutputSchema>;

export async function generateCareerSuggestions(input: GenerateCareerSuggestionsInput): Promise<GenerateCareerSuggestionsOutput> {
  return generateCareerSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCareerSuggestionsPrompt',
  input: {schema: GenerateCareerSuggestionsInputSchema},
  output: {schema: GenerateCareerSuggestionsOutputSchema},
  tools: [search],
  prompt: `You are an AI career coach providing a suggestion for students. Your tone should be helpful and encouraging.

  Based on the student's question and the conversation history, provide a relevant and helpful career suggestion.
  If the user asks for real-time information (e.g., "latest internships for software engineers"), use the provided search tool to find the most up-to-date information.

  Your response should be well-organized and easy to read. Use the following formatting guidelines:
  - Use bullet points or numbered lists to break down information in a point-by-point manner.
  - Use bold text to highlight key terms or concepts.
  - If applicable, include relevant URLs to resources, articles, or job portals that can help the student. Make sure the URLs are fully formed and in Markdown format (e.g., [Google](https://www.google.com)).
  - Include links to relevant YouTube videos that could be helpful, also in Markdown format.

  Your response MUST be a JSON object with a "suggestion" field containing your formatted answer.

  {{#if history}}
  Conversation History:
  {{#each history}}
  {{#ifEquals role 'user'}}
  User: {{{content}}}
  {{/ifEquals}}
  {{#ifEquals role 'model'}}
  Career Coach: {{{content}}}
  {{/ifEquals}}
  {{/each}}
  {{/if}}

  New Question: {{{query}}}`,
});

const generateCareerSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateCareerSuggestionsFlow',
    inputSchema: GenerateCareerSuggestionsInputSchema,
    outputSchema: GenerateCareerSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
