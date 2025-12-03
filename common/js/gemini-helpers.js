/**
 * Gemini API Helper Functions
 * Utilities for working with Google's Gemini AI API responses and data structures
 */

/**
 * Parses Gemini API response structure consistently
 * @param {Object} data - The API response data
 * @param {string} context - Context of the API call for error reporting
 * @returns {string} - Extracted response text
 * @throws {Error} - If response cannot be parsed
 */
export function parseGeminiResponse(data, context = 'API call') {
  if (!data || typeof data !== 'object') {
    throw new Error('Response data must be an object');
  }
  if (typeof context !== 'string') {
    throw new Error('Context must be a string');
  }
  
  // Extract response text from various possible structures
  let responseText = null;
  const candidate = data.candidates?.[0];
  
  if (candidate) {
    // Check for text in parts array
    if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          responseText = part.text;
          break;
        }
      }
    }
    
    // Fallback to other possible structures
    if (!responseText) {
      if (candidate.content?.text) {
        responseText = candidate.content.text;
      } else if (candidate.text) {
        responseText = candidate.text;
      } else if (candidate.output) {
        responseText = candidate.output;
      }
    }
    
    // Log if response was truncated but still try to extract text
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn(`${context} response was truncated due to MAX_TOKENS, but attempting to extract partial response`);
      // Don't return early - we might still have usable partial content
    }
  }
  
  if (!responseText) {
    const debugInfo = {
      data,
      candidate,
      candidateKeys: candidate ? Object.keys(candidate) : 'No candidate',
      candidateContent: candidate?.content
    };
    console.error(`No response text found in ${context} response:`, debugInfo);
    
    // For truncated responses, provide a different error message
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error(`${context} response was truncated and no readable content was found. Please try with a shorter input or increase maxOutputTokens.`);
    } else if (candidate?.finishReason) {
      throw new Error(`${context} response finished with reason: ${candidate.finishReason}. Unable to process request.`);
    } else {
      throw new Error(`No response text found in ${context} response. The API may be experiencing issues.`);
    }
  }
  
  return responseText;
}