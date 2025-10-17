
'use server';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import google from 'google-it';

export const search = ai.defineTool(
  {
    name: 'search',
    description: 'Performs a web search to get real-time information.',
    inputSchema: z.object({
      query: z.string().describe('The search query.'),
    }),
    outputSchema: z.array(
      z.object({
        title: z.string(),
        link: z.string(),
        snippet: z.string(),
      })
    ),
  },
  async (input) => {
    try {
      const results = await google({ query: input.query, limit: 5 });
      return results.map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
      }));
    } catch (error) {
      console.error('Search tool error:', error);
      return [];
    }
  }
);
