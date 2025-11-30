/**
 * Comment Moderation Orchestrator
 * Coordinates between local (Prompt API) and cloud (Gemini) implementations
 */

import { analyzeClientComment } from './clientside-comment-moderation.js';
import { analyzeCommentWithGemini } from './serverside-comment-moderation.js';
import { isPromptApiAvailable } from './local-ai-helpers.js';

/**
 * Analyzes comment using the best available AI: local first, cloud fallback
 * @param {string} comment - The comment text to analyze
 * @param {string} imageDescription - Optional description of the image being commented on
 * @returns {Object} Analysis result with isProblematic, reason, and suggestion
 */
export async function analyzeComment(comment, imageDescription = null) {
  // Check if Prompt API is available
  if (isPromptApiAvailable()) {
    try {
      console.log('🔬 Attempting local AI comment analysis with Prompt API...');
      const analysis = await analyzeClientComment(comment, imageDescription);
      console.log('✅ Local AI comment analysis successful');
      return analysis;
    } catch (error) {
      console.warn('⚠️ Local AI comment analysis failed, falling back to cloud AI:', error.message);
      // Fall through to Gemini fallback
    }
  } else {
    console.log('ℹ️ Prompt API not available, using cloud AI for comment analysis');
  }
  
  // Fallback to Gemini using the existing function
  console.log('☁️ Using Gemini AI for comment analysis...');
  const analysis = await analyzeCommentWithGemini(comment, imageDescription);
  console.log('✅ Cloud AI comment analysis successful');
  return analysis;
}