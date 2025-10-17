
"use server";

import { generateCareerSuggestions } from "@/ai/flows/generate-career-suggestions";
import { generateGuide, type GenerateGuideInput } from "@/ai/flows/generate-guide";
import { type Message } from "@/ai/flows/types";
import { finjoBuddy } from "@/ai/flows/finjo-buddy";
import { getNews as getNewsFlow, type NewsArticle } from "@/ai/flows/get-news";
import { generateImage as generateImageFlow } from "@/ai/flows/generate-image";


export async function getAiSuggestion(query: string, history: Message[]): Promise<string> {
  if (!query) {
    throw new Error("Please provide a query.");
  }
  try {
    const result = await generateCareerSuggestions({ query, history });
    return result.suggestion;
  } catch (e: any) {
    console.error(e);
    // It's better to throw the error and let the client handle it
    // This provides more specific error messages on the client side.
    throw new Error(e.message || "Sorry, I couldn't generate a suggestion at the moment. Please try again later.");
  }
}

export async function getAiGuide(topic: GenerateGuideInput): Promise<string> {
  try {
    const result = await generateGuide(topic);
    return result.guide;
  } catch (e: any) {
    console.error(e);
    throw new Error(e.message || "Sorry, I couldn't generate a guide at the moment. Please try again later.");
  }
}

export async function getFinjoBuddyResponse(query: string, history: Message[]): Promise<string> {
  if (!query) {
    throw new Error("Please provide a query.");
  }
  try {
    const result = await finjoBuddy({ query, history });
    return result.response;
  } catch (e: any) {
    console.error(e);
    throw new Error(e.message || "Sorry, I couldn't generate a response at the moment. Please try again later.");
  }
}

export async function getNews(categories: string[]): Promise<NewsArticle[]> {
  try {
    const results = await getNewsFlow({ categories });
    return results.articles;
  } catch (e: any) {
    console.error(e);
    throw new Error(e.message || "Sorry, I couldn't fetch the news at the moment. Please try again later.");
  }
}

export async function generateImage(prompt: string): Promise<string> {
  if (!prompt) {
    throw new Error("Please provide a prompt.");
  }
  try {
    const result = await generateImageFlow({ prompt });
    return result.imageUrl;
  } catch (e: any) {
    console.error(e);
    throw new Error(e.message || "Sorry, I couldn't generate an image at the moment. Please try again later.");
  }
}
