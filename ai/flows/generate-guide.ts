
'use server';

/**
 * @fileOverview An AI agent to generate a guide on a specific topic.
 *
 * - generateGuide - A function that handles the generation of the guide.
 * - GenerateGuideInput - The input type for the generateGuide function.
 * - GenerateGuideOutput - The return type for the generateGuide function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateGuideInputSchema = z.enum(["INTERVIEW_PREP", "INTERNSHIP_HUNT", "LEARNING_PATH"]);
export type GenerateGuideInput = z.infer<typeof GenerateGuideInputSchema>;

const GenerateGuideOutputSchema = z.object({
  guide: z.string().describe('The AI-generated guide. This should be a helpful and relevant response to the student\'s query.'),
});
export type GenerateGuideOutput = z.infer<typeof GenerateGuideOutputSchema>;

export async function generateGuide(input: GenerateGuideInput): Promise<GenerateGuideOutput> {
  return generateGuideFlow(input);
}

const interviewPrompt = `You are an AI career coach specializing in interview preparation.
Your task is to provide a comprehensive, step-by-step guide to help a student ace their job interviews.
Start by welcoming the user and explaining that you'll guide them through the process.
Then, ask them what kind of role or industry they are interviewing for to tailor your advice.
Your tone should be encouraging and supportive.
Organize your response with clear headings, bullet points, and bold text for key concepts.
Include links to valuable resources, including relevant YouTube videos.`;

const internshipPrompt = `You are an AI career coach specializing in helping students find internships.
Your task is to provide a comprehensive, step-by-step guide to help a student land their dream internship.
Start by welcoming the user and explaining the internship hunting process.
Then, ask them about their field of interest and what kind of internship they're looking for.
Your tone should be encouraging and action-oriented.
Organize your response with clear headings, bullet points, and bold text for key milestones.
Include links to popular internship job boards, networking platforms, and YouTube videos for tips and advice.`;

const learningPathPrompt = `You are an AI career coach specializing in skill development and creating learning paths.
Your task is to provide a comprehensive, step-by-step guide to help a student build a learning path for a new skill or career field.
Start by welcoming the user and explaining the importance of a structured learning path.
Then, ask them what skill or career field they want to focus on.
Your tone should be motivational and clear.
Organize your response with clear stages (e.g., Foundational, Intermediate, Advanced), using bullet points and bold text for important skills or technologies.
Include links to online courses, tutorials, documentation, and relevant YouTube tutorials.`;

const generateGuideFlow = ai.defineFlow(
  {
    name: 'generateGuideFlow',
    inputSchema: GenerateGuideInputSchema,
    outputSchema: GenerateGuideOutputSchema,
  },
  async (topic) => {
    let promptText = '';
    if (topic === 'INTERVIEW_PREP') {
      promptText = interviewPrompt;
    } else if (topic === 'INTERNSHIP_HUNT') {
      promptText = internshipPrompt;
    } else if (topic === 'LEARNING_PATH') {
      promptText = learningPathPrompt;
    }

    const { output } = await ai.generate({
      prompt: promptText,
      output: {
        format: 'json',
        schema: GenerateGuideOutputSchema
      }
    });

    return output!;
  }
);
