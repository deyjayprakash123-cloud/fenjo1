
'use server';

/**
 * @fileOverview Summarizes a job description from text or image data based on a user prompt.
 *
 * - summarizeJobDescription - A function that handles the job description summarization process.
 * - SummarizeJobDescriptionInput - The input type for the summarizeJobDescription function.
 * - SummarizeJobDescriptionOutput - The return type for the summarizeJobDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeJobDescriptionInputSchema = z.object({
  jobDescription: z
    .string()
    .describe(
      'The document content to process. This can be plain text or a data URI for an image.'
    ),
  prompt: z.string().describe('The user\'s instruction on what to do with the document.'),
});
export type SummarizeJobDescriptionInput = z.infer<
  typeof SummarizeJobDescriptionInputSchema
>;

const SummarizeJobDescriptionOutputSchema = z.object({
  summary: z.string().describe('A concise summary or response based on the user\'s prompt and the provided document.'),
});
export type SummarizeJobDescriptionOutput = z.infer<
  typeof SummarizeJobDescriptionOutputSchema
>;

export async function summarizeJobDescription(
  input: SummarizeJobDescriptionInput
): Promise<SummarizeJobDescriptionOutput> {
  return summarizeJobDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeJobDescriptionPrompt',
  input: {schema: SummarizeJobDescriptionInputSchema},
  output: {schema: SummarizeJobDescriptionOutputSchema},
  prompt: `You are an expert career coach. A student has provided a document and a prompt.
  
  Your task is to follow the user's prompt to process the document. The document could be text or an image.

  User's Prompt: {{{prompt}}}

  Document Content:
  {{#if (startsWith jobDescription "data:image")}}
  {{media url=jobDescription}}
  {{else}}
  {{{jobDescription}}}
  {{/if}}
  `,
});

const summarizeJobDescriptionFlow = ai.defineFlow(
  {
    name: 'summarizeJobDescriptionFlow',
    inputSchema: SummarizeJobDescriptionInputSchema,
    outputSchema: SummarizeJobDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
