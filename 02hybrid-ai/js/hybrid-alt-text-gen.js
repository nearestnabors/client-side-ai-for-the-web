/**
 * Hybrid Alt Text Generation
 * Uses Chrome's Prompt API when available, falls back to Google's Gemini AI
 */

import { generateGeminiAltText } from './serverside-alt-text-gen.js';
import { parsePromptApiResponse, isPromptApiAvailable, createPromptApiSession } from './local-ai-helpers.js';

// Constants
const PROMPT_API_MAX_LENGTH = 1000; // Prompt API has stricter limits

/**
 * Generates alt text using Chrome's Prompt API (local inference)
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
async function generatePromptApiAltText(imageData, controller) {
  const session = await createPromptApiSession();
  if (!session) {
    throw new Error('Failed to create Prompt API session');
  }
  
  try {
    // Note: Current Prompt API doesn't support images directly
    // This is a placeholder for when image support is added
    // For now, we'll fall back to Gemini for image analysis
    
    const prompt = "Generate a concise alt text description for an uploaded image, focusing on the main subject, key visual elements, and setting. Since I cannot see the image, please provide a helpful template response that encourages the user to add their own description.";
    
    const response = await session.prompt(prompt, {
      signal: controller.signal
    });
    
    const altText = parsePromptApiResponse(response, 'Local image analysis');
    
    // Clean up the session
    session.destroy();
    
    return altText;
  } catch (error) {
    // Clean up the session on error
    if (session && session.destroy) {
      session.destroy();
    }
    throw error;
  }
}


/**
 * Generates alt text using hybrid approach: Prompt API first, Gemini fallback
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
export async function generateHybridAltText(imageData, controller) {
  if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    throw new Error('Valid image data URL is required');
  }
  if (!controller || !(controller instanceof AbortController)) {
    throw new Error('AbortController instance is required');
  }
  
  // Check if Prompt API is available
  if (isPromptApiAvailable()) {
    try {
      console.log('🔬 Attempting local AI analysis with Prompt API...');
      // Note: Current Prompt API doesn't support images yet
      // For now, we'll go directly to Gemini for image analysis
      throw new Error('Prompt API does not support image analysis yet');
      
      // Uncomment when Prompt API supports images:
      // const altText = await generatePromptApiAltText(imageData, controller);
      // console.log('✅ Local AI analysis successful');
      // return altText;
    } catch (error) {
      console.warn('⚠️ Local AI failed, falling back to cloud AI:', error.message);
      // Fall through to Gemini fallback
    }
  } else {
    console.log('ℹ️ Prompt API not available, using cloud AI');
  }
  
  // Fallback to Gemini using the existing function
  console.log('☁️ Using Gemini AI for image analysis...');
  const altText = await generateGeminiAltText(imageData, controller);
  console.log('✅ Cloud AI analysis successful');
  return altText;
}