/**
 * Hybrid Alt Text Generation
 * Uses Chrome's Prompt API when available, falls back to Google's Gemini AI
 */

import { generateGeminiAltText } from './serverside-alt-text-gen.js';
import { parsePromptApiResponse, checkPromptApiAvailability, createPromptApiSession } from './local-ai-helpers.js';

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
    console.log('🖼️ Testing multimodal Prompt API with real image data...');
    
    // Try the attachments format with real image data
    const response = await session.prompt('Generate a concise alt text description for this image, focusing on the main subject, key visual elements, and setting.', {
      attachments: [{
        type: 'image',
        data: imageData
      }],
      signal: controller.signal
    });
    
    console.log('🎉 Multimodal Prompt API response received:', response.substring(0, 100) + '...');
    
    // Check if the response indicates the AI actually saw the image
    const lowercaseResponse = response.toLowerCase();
    if (lowercaseResponse.includes('provide') && lowercaseResponse.includes('image') || 
        lowercaseResponse.includes("can't see") || 
        lowercaseResponse.includes("need") && lowercaseResponse.includes("image")) {
      console.log('❌ AI response suggests image not visible, falling back to Gemini');
      throw new Error('Prompt API did not process the image successfully');
    }
    
    const altText = parsePromptApiResponse(response, 'Local multimodal image analysis');
    
    // Clean up the session
    session.destroy();
    
    return altText;
  } catch (error) {
    console.log('❌ Multimodal Prompt API failed:', error.message);
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
  
  // Check if Prompt API is available and ready
  const promptApiStatus = await checkPromptApiAvailability();
  
  if (promptApiStatus.available && promptApiStatus.ready) {
    try {
      console.log('🔬 Attempting local multimodal AI analysis with Prompt API...');
      const altText = await generatePromptApiAltText(imageData, controller);
      console.log('✅ Local multimodal AI analysis successful');
      return altText;
    } catch (error) {
      console.warn('⚠️ Local multimodal AI failed, falling back to cloud AI:', error.message);
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