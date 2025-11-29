/**
 * Server-side Alt Text Generation
 * Handles communication with Google's Gemini AI for alt-text generation
 */

import { handleError, createApiError } from '/common/js/ui-helpers.js';
import { getApiKey } from '/common/js/api-key.js';
import { parseGeminiResponse } from './gemini-helpers.js';

// Constants
const MAX_OUTPUT_TOKENS = 4000;
const AI_TEMPERATURE = 0.4;

/**
 * Sends the image to Google's Gemini AI for alt-text generation
 * Uses the configured API key to make the request
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
export async function generateGeminiAltText(imageData, controller) {
  if (typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    throw new Error('Valid image data URL is required');
  }
  if (!controller || !(controller instanceof AbortController)) {
    throw new Error('AbortController instance is required');
  }
  
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('❌ Please configure your Google AI API key first');
  }
  
  // Extract image data and detect MIME type
  const [mimeInfo, base64Data] = imageData.split(',');
  const mimeMatch = mimeInfo.match(/data:([^;]+)/);
  if (!mimeMatch || !mimeMatch[1]) {
    throw new Error('Invalid image data format. Expected data URL with MIME type.');
  }
  const mimeType = mimeMatch[1];
  
  // Sending request to Gemini AI for alt-text generation
  
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