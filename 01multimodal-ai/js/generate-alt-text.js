/**
 * Gemini AI Alt-Text Generation
 * Server-based alt-text generation using Google's Gemini AI API
 */

import { handleError, createApiError, parseGeminiResponse } from '/common/js/ui-helpers.js';
import { getApiKey } from '/common/js/api-key.js';

/**
 * Sends the image to Google's Gemini AI for alt-text generation
 * Uses the configured API key to make the request
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
export async function generateGeminiAltText(imageData, controller) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('❌ Please configure your Google AI API key first');
  }
  
  // Extract image data and detect MIME type
  const [mimeInfo, base64Data] = imageData.split(',');
  const mimeType = mimeInfo.match(/data:([^;]+)/)[1];
  
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
        maxOutputTokens: 2000,
        temperature: 0.4
      }
    })
  });
  
  // Handle API errors
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error Response:', errorText);
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
  console.log('Generated alt text:', altText);
  
  return altText;
}

// Gemini AI alt-text generator module loaded