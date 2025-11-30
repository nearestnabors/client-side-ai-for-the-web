/**
 * Client-side Comment Moderation
 * Uses Chrome's Prompt API for local comment analysis
 */

import { parsePromptApiResponse, createPromptApiSession, isPromptApiAvailable } from './local-ai-helpers.js';

// Constants
const MAX_OUTPUT_TOKENS = 3000;
const AI_TEMPERATURE = 0.3;

/**
 * Analyzes comment using Chrome's Prompt API (local inference)
 * @param {string} comment - The comment text to analyze
 * @param {string} imageDescription - Optional description of the image being commented on
 * @returns {Object} Analysis result with isProblematic, reason, and suggestion
 */
export async function analyzeClientComment(comment, imageDescription = null) {
  const session = await createPromptApiSession();
  if (!session) {
    // Check if it's a user activation issue vs general availability
    if (isPromptApiAvailable() && !navigator.userActivation?.isActive) {
      throw new Error('User interaction required to initialize local AI. Please click, tap, or press a key first.');
    }
    throw new Error('Failed to create Prompt API session');
  }
  
  try {
    const prompt = `You are a comment moderator for a constructive discussion platform. Analyze this comment and flag it as problematic if it contains:

- Personal attacks, insults, or harassment
- Hate speech or discriminatory language  
- Excessive negativity without constructive feedback
- Hostile, aggressive, or inflammatory tone
- Comments that could discourage participation (like "Hate it!" or "This sucks!" without explanation)
- Bad faith arguments or trolling behavior

Even simple negative statements should be flagged if they don't provide constructive feedback or seem designed to be discouraging.

${imageDescription ? `Context: This comment is about an image described as: "${imageDescription}"\\n\\n` : ''}Return only JSON: {"isProblematic": true/false, "reason": "brief reason if problematic", "suggestion": "Create an alternative post that captures the same intent but is more respectful and constructive. Keep in mind, this is a discussion platform about the appearance of photos, not about philosophical disagreements. The suggestion should be written as though by the author of the original comment, matching their tone and style but changing the content to be more respectful and constructive"}

Comment to analyze: "${comment.replace(/"/g, '\\"')}"`;

    const response = await session.prompt(prompt);
    const responseText = parsePromptApiResponse(response, 'Local comment analysis');
    
    // Clean up the session
    session.destroy();
    
    // Extract JSON from the response
    try {
      const jsonMatch = responseText.match(/\\{[\\s\\S]*\\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid response format - no JSON object found');
      }
    } catch (parseError) {
      throw new Error(`Invalid response format from local AI: ${parseError.message}`);
    }
  } catch (error) {
    // Clean up the session on error
    if (session && session.destroy) {
      session.destroy();
    }
    throw error;
  }
}