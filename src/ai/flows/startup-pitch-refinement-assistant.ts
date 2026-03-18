'use server';
/**
 * @fileOverview A Genkit flow for refining startup pitch descriptions.
 *
 * - refineStartupPitch - A function that refines a startup pitch description.
 * - RefineStartupPitchInput - The input type for the refineStartupPitch function.
 * - RefineStartupPitchOutput - The return type for the refineStartupPitch function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RefineStartupPitchInputSchema = z.object({
  pitchDescription: z.string().describe('The original pitch description from the startup.'),
  startupName: z.string().optional().describe('The name of the startup, if available.'),
  industry: z.string().optional().describe('The industry the startup operates in, if available.'),
  fundingNeeded: z.string().optional().describe('The funding amount the startup is seeking, if available.')
});
export type RefineStartupPitchInput = z.infer<typeof RefineStartupPitchInputSchema>;

const RefineStartupPitchOutputSchema = z.object({
  refinedPitchDescription: z.string().describe('The refined and more compelling pitch description.'),
  suggestions: z.array(z.string()).describe('A list of suggestions for further improvement or alternative phrasings.')
});
export type RefineStartupPitchOutput = z.infer<typeof RefineStartupPitchOutputSchema>;

export async function refineStartupPitch(
  input: RefineStartupPitchInput
): Promise<RefineStartupPitchOutput> {
  return startupPitchRefinementAssistantFlow(input);
}

const startupPitchRefinementPrompt = ai.definePrompt({
  name: 'startupPitchRefinementPrompt',
  input: { schema: RefineStartupPitchInputSchema },
  output: { schema: RefineStartupPitchOutputSchema },
  prompt: `You are an expert pitch refinement assistant for startups. Your goal is to help founders make their pitch descriptions more compelling, concise, and effectively communicate their unique value proposition to potential investors.

Consider the following details:
{{#if startupName}}Startup Name: {{{startupName}}}{{/if}}
{{#if industry}}Industry: {{{industry}}}{{/if}}
{{#if fundingNeeded}}Funding Needed: {{{fundingNeeded}}}{{/if}}

Original Pitch Description:
{{{pitchDescription}}}

Please provide a refined version of the pitch description. Focus on clarity, impact, and investor appeal. Also, provide a list of 2-3 actionable suggestions for further improving the pitch or alternative phrasings that could be considered.

Ensure the output adheres to the specified JSON schema.`,
});

const startupPitchRefinementAssistantFlow = ai.defineFlow(
  {
    name: 'startupPitchRefinementAssistantFlow',
    inputSchema: RefineStartupPitchInputSchema,
    outputSchema: RefineStartupPitchOutputSchema,
  },
  async (input) => {
    const { output } = await startupPitchRefinementPrompt(input);
    return output!;
  }
);
