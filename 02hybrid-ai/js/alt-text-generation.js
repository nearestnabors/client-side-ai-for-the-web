/**
 * Alt Text Generation Feature
 * Complete implementation with client-side (Prompt API) and server-side (Gemini) support
 */

import { tryClientSideThenServerSide, parsePromptApiResponse, createPromptApiSession, isPromptApiAvailable } from './client-side-ai-helpers.js';
import { handleError, createApiError } from '../../common/js/ui-helpers.js';
import { getApiKey } from '../../common/js/api-key.js';
import { parseGeminiResponse } from '../../common/js/gemini-helpers.js';

// Constants
const MAX_OUTPUT_TOKENS = 4000;
const AI_TEMPERATURE = 0.4;

/**
 * Generates alt text using Chrome's Prompt API (client-side inference)
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
async function generateClientAltText(imageData, controller) {
  const session = await createPromptApiSession();
  if (!session) {
    // Check if it's a user activation issue vs general availability
    if (isPromptApiAvailable() && !navigator.userActivation?.isActive) {
      throw new Error('User interaction required to initialize client-side AI. Please click, tap, or press a key first.');
    }
    throw new Error('Failed to create Prompt API session');
  }
  
  try {
    console.log('🖼️ Using Prompt API with proper multimodal format...');
    
    // Get the image element directly from the DOM - much more efficient!
    // The image is already displayed in the preview
    const imageElement = document.querySelector('#imagePreview img');
    
    if (!imageElement) {
      throw new Error('Image element not found in preview');
    }
    
    console.log('📸 Using image element from DOM:', imageElement.width, 'x', imageElement.height);
    
    // Use the correct Prompt API format - pass image element directly in the prompt
    // Per https://github.com/webmachinelearning/prompt-api#multimodal-inputs
    const response = await session.prompt([
      'Generate a concise alt text description for this image, focusing on the main subject, key visual elements, and setting.',
      imageElement
    ], {
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
    
    const altText = parsePromptApiResponse(response, 'Client-side multimodal image analysis');
    
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
 * Sends the image to Google's Gemini AI for alt-text generation
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
async function generateGeminiAltText(imageData, controller) {
  if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    throw new Error('Valid image data URL is required');
  }
  
  // Extract image data and detect MIME type
  const [mimeInfo, base64Data] = imageData.split(',');
  const mimeMatch = mimeInfo.match(/data:([^;]+)/);
  if (!mimeMatch || !mimeMatch[1]) {
    throw new Error('Invalid image data format. Expected data URL with MIME type.');
  }
  const mimeType = mimeMatch[1];
  
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('❌ Please configure your Google AI API key first');
  }
  
  // Make API request to Gemini
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: "Generate a concise alt text description for this image, focusing on the main subject, key visual elements, and setting."
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: AI_TEMPERATURE
      }
    })
  });
  
  // Handle API errors
  if (!response.ok) {
    const errorText = await response.text();
    handleError(new Error(`API Error Response: ${errorText}`), 'Gemini API call');
    let errorMsg;
    try {
      const error = JSON.parse(errorText);
      errorMsg = error.error?.message || createApiError(response, 'Image analysis API');
    } catch {
      errorMsg = createApiError(response, 'Image analysis API');
    }
    throw new Error(errorMsg);
  }
  
  // Parse the response
  const data = await response.json();
  const altText = parseGeminiResponse(data, 'Image analysis').trim();
  
  return altText;
}

/**
 * Generates alt text using the best available AI: client-side first, server-side fallback
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
/**
 * Generates alt text using the best available AI: client-side first, server-side fallback
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
export async function generateAltText(imageData, controller) {
  return tryClientSideThenServerSide(
    generateClientAltText,
    generateGeminiAltText,
    'image analysis',
    imageData,
    controller
  );
}