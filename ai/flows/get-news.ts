
'use server';

/**
 * @fileOverview An AI agent to fetch recent news articles.
 *
 * - getNews - A function that handles fetching news from different categories.
 * - GetNewsInput - The input type for the getNews function.
 * - GetNewsOutput - The return type for the getNews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { search } from '../tools/search';

const GetNewsInputSchema = z.object({
  categories: z.array(z.string()).describe('A list of news categories to search for (e.g., "tech", "jobs").'),
});
export type GetNewsInput = z.infer<typeof GetNewsInputSchema>;

const NewsArticleSchema = z.object({
  title: z.string(),
  link: z.string(),
  snippet: z.string(),
});
export type NewsArticle = z.infer<typeof NewsArticleSchema>;


const GetNewsOutputSchema = z.object({
    articles: z.array(NewsArticleSchema).describe("A list of news articles found.")
});
export type GetNewsOutput = z.infer<typeof GetNewsOutputSchema>;


export async function getNews(input: GetNewsInput): Promise<GetNewsOutput> {
  return getNewsFlow(input);
}

const getNewsFlow = ai.defineFlow(
  {
    name: 'getNewsFlow',
    inputSchema: GetNewsInputSchema,
    outputSchema: GetNewsOutputSchema,
  },
  async ({ categories }) => {
    const allResults: NewsArticle[] = [];
    
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const toDate = formatDate(today);
    const fromDate = formatDate(sevenDaysAgo);

    // Add a random element to get different news on refresh
    const randomKeywords = ["breaking", "updates", "trends", "insights", "analysis"];
    const randomWord = randomKeywords[Math.floor(Math.random() * randomKeywords.length)];

    for (const category of categories) {
        try {
            const query = `${category} ${randomWord} after:${fromDate} before:${toDate}`;
            const searchResults = await search({ query });
            // Add category to each result if needed, or just push them
            allResults.push(...searchResults.slice(0, 3)); // Get top 3 for each category
        } catch (error) {
            console.error(`Error searching for news in category "${category}":`, error);
        }
    }
    
    // Remove duplicates based on link
    const uniqueResults = Array.from(new Map(allResults.map(item => [item.link, item])).values());

    return { articles: uniqueResults };
  }
);
