/**
 * Alt Text Generation Orchestrator
 * Coordinates between local (Prompt API) and cloud (Gemini) implementations
 */

import { generateClientAltText } from './clientside-alt-text-gen.js';
import { generateGeminiAltText } from './serverside-alt-text-gen.js';
import { checkPromptApiAvailability } from './local-ai-helpers.js';

/**
 * Generates alt text using the best available AI: local first, cloud fallback
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
export async function generateAltText(imageData, controller) {
  if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    throw new Error('Valid image data URL is required');
  }
  if (!controller || !(controller instanceof AbortController)) {
    throw new Error('AbortController instance is required');
  }
  
  // Check if Prompt API is available and ready
  const promptApiStatus = await checkPromptApiAvailability();
  
  if (promptApiStatus.available && promptApiStatus.ready) {
    try {
      console.log('🔬 Attempting local AI analysis with Prompt API...');
      const altText = await generateClientAltText(imageData, controller);
      console.log('✅ Local AI analysis successful');
      return altText;
    } catch (error) {
      console.warn('⚠️ Local AI failed, falling back to cloud AI:', error.message);
      // Fall through to Gemini fallback
    }
  } else if (promptApiStatus.available && promptApiStatus.needsDownload) {
    console.log('⬇️ Prompt API needs model download, using cloud AI');
  } else {
    console.log('ℹ️ Prompt API not available, using cloud AI');
  }
  
  // Fallback to Gemini using the existing function
  console.log('☁️ Using Gemini AI for image analysis...');
  const altText = await generateGeminiAltText(imageData, controller);
  console.log('✅ Cloud AI analysis successful');
  return altText;
}