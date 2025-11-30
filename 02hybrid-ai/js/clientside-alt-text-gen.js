/**
 * Client-side Alt Text Generation
 * Uses Chrome's Prompt API for local image analysis
 */

import { parsePromptApiResponse, createPromptApiSession, isPromptApiAvailable } from './local-ai-helpers.js';

// Constants
const PROMPT_API_MAX_LENGTH = 1000; // Prompt API has stricter limits

/**
 * Generates alt text using Chrome's Prompt API (local inference)
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
export async function generateClientAltText(imageData, controller) {
  const session = await createPromptApiSession();
  if (!session) {
    // Check if it's a user activation issue vs general availability
    if (isPromptApiAvailable() && !navigator.userActivation?.isActive) {
      throw new Error('User interaction required to initialize local AI. Please click, tap, or press a key first.');
    }
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