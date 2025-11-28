/**
 * Gemini AI Alt-Text Generation
 * Server-based alt-text generation using Google's Gemini AI API
 */

import { handleError, createApiError } from '/common/js/ui-helpers.js';

/**
 * Sends the image to Google's Gemini AI for alt-text generation
 * Uses the configured API key to make the request
 * @param {string} imageData - Base64 data URL of the image
 * @param {AbortController} controller - Abort controller for cancellation
 * @returns {Promise<string>} - Generated alt text
 */
export async function generateGeminiAltText(imageData, controller) {
  if (!window.geminiApiKey) {
    throw new Error('❌ Please configure your Google AI API key first');
  }
  
  // Extract image data and detect MIME type
  const [mimeInfo, base64Data] = imageData.split(',');
  const mimeType = mimeInfo.match(/data:([^;]+)/)[1];
  
  console.log('Sending request to Gemini API...');
  
  // Make API request to Gemini
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${window.geminiApiKey}`, {
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
  
  console.log('Response status:', response.status);
  
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
  console.log('API Response:', data);
  
  // Extract alt text from various possible response structures
  let altText = null;
  const candidate = data.candidates?.[0];
  
  if (candidate) {
    console.log('Full candidate object:', JSON.stringify(candidate, null, 2));
    
    // Check if response was truncated
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('Response was truncated due to MAX_TOKENS - attempting to extract partial text');
    }
    
    // Try multiple possible response structures
    if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
      // Look through all parts for text
      for (const part of candidate.content.parts) {
        if (part.text) {
          altText = part.text.trim();
          break;
        }
      }
    }
    
    // Fallback to other possible structures
    if (!altText) {
      if (candidate.content?.text) {
        altText = candidate.content.text.trim();
      } else if (candidate.text) {
        altText = candidate.text.trim();
      } else if (candidate.output) {
        altText = candidate.output.trim();
      }
    }
  }
  
  console.log('Extracted alt text:', altText);
  
  if (altText) {
    // If truncated, append a note
    if (candidate?.finishReason === 'MAX_TOKENS') {
      return altText + ' (response truncated)';
    } else {
      return altText;
    }
  } else {
    console.error('No alt text found in response:', data);
    console.error('Response structure:', JSON.stringify(data, null, 2));
    
    // Provide more helpful error message
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error('Response was truncated and no text was generated. Try with a smaller image or increase maxOutputTokens.');
    } else if (candidate?.finishReason) {
      throw new Error(`API response finished with reason: ${candidate.finishReason}`);
    } else {
      throw new Error('No alt text generated - unexpected response structure');
    }
  }
}

console.log('🤖 Gemini AI alt-text generator module loaded');