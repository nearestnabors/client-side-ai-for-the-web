/**
 * Alt Text Generation Module
 * Complete implementation with clientside (Prompt API) and serverside (Gemini) support
 * Coordinates between clientside and serverside implementations for image alt text generation
 */

import { handleError, createApiError } from '../../common/js/ui-helpers.js';
import { getApiKey } from '../../common/js/api-key.js';
import { parseGeminiResponse } from '../../common/js/gemini-helpers.js';
import { parsePromptApiResponse, createPromptApiSession, checkPromptApiAvailability } from './clientside-ai-helpers.js';

// Constants
const MAX_OUTPUT_TOKENS = 4000;
const AI_TEMPERATURE = 0.4;
const PROMPT_API_MAX_LENGTH = 1000; // Prompt API has stricter limits

/**
 * Generates alt text using Chrome's Prompt API (clientside inference)
 * @param {HTMLImageElement} imgElement - DOM img element containing the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
async function generateClientAltText(imgElement, controller) {
  const session = await createPromptApiSession();
  if (!session) {
    throw new Error('Failed to create Prompt API session');
  }
  
  try {
    // Use the correct multimodal message format for Prompt API
    const response = await session.prompt([{
      role: "user",
      content: [
        { type: "text", value: "Generate a concise alt text description for this image, focusing on the main subject, key visual elements, and setting." },
        { type: "image", value: imgElement }
      ]
    }], {
      signal: controller.signal
    });
    
    // Check if the response indicates the AI actually saw the image
    const lowercaseResponse = response.toLowerCase();
    if (lowercaseResponse.includes('provide') && lowercaseResponse.includes('image') || 
        lowercaseResponse.includes("can't see") || 
        lowercaseResponse.includes("need") && lowercaseResponse.includes("image")) {
      throw new Error('Prompt API did not process the image successfully');
    }
    
    const altText = parsePromptApiResponse(response, 'Clientside multimodal image analysis');
    
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
 * Sends the image to Google's Gemini AI for alt-text generation
 * Uses the configured API key to make the request
 * @param {HTMLImageElement} imgElement - DOM img element containing the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
async function generateGeminiAltText(imgElement, controller) {
  if (!imgElement || !(imgElement instanceof HTMLImageElement)) {
    throw new Error('Valid HTMLImageElement is required');
  }
  
  // Check if operation was aborted before proceeding
  if (controller.signal.aborted) {
    throw new Error('Operation was cancelled');
  }
  
  // Extract image data URL from DOM element
  const imageData = imgElement.src;
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
  
  // Validate MIME type is supported by Gemini
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!supportedTypes.includes(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}. Supported types: ${supportedTypes.join(', ')}`);
  }
  
  if (!base64Data) {
    throw new Error('No image data found in the data URL');
  }
  
  const prompt = `Generate a concise, descriptive alt text for this image that would help someone understand what's shown. 
  Focus on:
  - The main subject or focal point
  - Key visual elements and their arrangement
  - The setting or context
  - Any text visible in the image
  
  Keep it under 125 characters if possible, but prioritize accuracy and usefulness.
  Return only the alt text, no additional formatting or explanation.`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${getApiKey()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
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
      }),
      signal: controller.signal
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || createApiError(response, 'Image analysis API'));
    }
    
    const data = await response.json();
    const altText = parseGeminiResponse(data, 'Image analysis');
    
    // Clean up the alt text (remove any quotes if present)
    return altText.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    handleError(error, 'Image analysis');
    throw error;
  }
}

/**
 * Generates alt text using the best available AI: clientside first, serverside fallback
 * @param {HTMLImageElement} imgElement - DOM img element containing the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
export async function generateAltText(imgElement, controller) {
  if (!imgElement || !(imgElement instanceof HTMLImageElement)) {
    throw new Error('Valid HTMLImageElement is required');
  }
  if (!controller || !(controller instanceof AbortController)) {
    throw new Error('AbortController instance is required');
  }
  
  // Check if Prompt API is available and ready
  const promptApiStatus = await checkPromptApiAvailability();
  
  if (promptApiStatus.available && promptApiStatus.ready) {
    try {
      // Attempting clientside AI analysis with Prompt API...
      const altText = await generateClientAltText(imgElement, controller);
      return altText;
    } catch (error) {
      // If operation was aborted, don't fallback - just rethrow
      if (error.name === 'AbortError' || controller.signal.aborted) {
        throw error;
      }
      // Fall through to Gemini fallback for other errors
      console.warn('⚠️ Clientside AI failed, falling back to serverside AI:', error.message);
    }
  } else if (promptApiStatus.available && promptApiStatus.needsDownload) {
    console.log('⬇️ Prompt API needs model download, using serverside AI to generate alt text');
  } else {
    console.log('ℹ️ Prompt API not available, using serverside AI to generate alt text');
  }
  
  // Check if operation was aborted before attempting Gemini fallback
  if (controller.signal.aborted) {
    throw new Error('Operation was cancelled');
  }
  
  // Fallback to serverside Gemini AI for image analysis...
  const altText = await generateGeminiAltText(imgElement, controller);
  return altText;
}