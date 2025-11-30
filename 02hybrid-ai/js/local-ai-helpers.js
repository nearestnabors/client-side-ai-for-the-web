/**
 * Local AI Helper Functions
 * Utilities for working with Chrome's Prompt API and fallback responses
 */

/**
 * Parses Prompt API response structure consistently
 * @param {string} responseText - The response text from Prompt API
 * @param {string} context - Context of the API call for error reporting
 * @returns {string} - Cleaned response text
 * @throws {Error} - If response cannot be parsed
 */
export function parsePromptApiResponse(responseText, context = 'API call') {
  if (typeof responseText !== 'string') {
    throw new Error('Response must be a string');
  }
  if (typeof context !== 'string') {
    throw new Error('Context must be a string');
  }
  
  // Prompt API returns plain text, so just clean it up
  const cleanedText = responseText.trim();
  
  if (!cleanedText) {
    throw new Error(`No response text found in ${context} response. The API may be experiencing issues.`);
  }
  
  return cleanedText;
}

/**
 * Checks if Prompt API is available in the current browser
 * @returns {boolean} - True if Prompt API is supported
 */
export function isPromptApiAvailable() {
  return typeof window !== 'undefined' && 
         'ai' in window && 
         'languageModel' in window.ai &&
         typeof window.ai.languageModel.capabilities === 'function';
}

/**
 * Gets Prompt API capabilities and checks if it's ready for use
 * @returns {Promise<Object|null>} - Capabilities object or null if not available
 */
export async function getPromptApiCapabilities() {
  if (!isPromptApiAvailable()) {
    return null;
  }
  
  try {
    const capabilities = await window.ai.languageModel.capabilities();
    return capabilities;
  } catch (error) {
    console.warn('Failed to get Prompt API capabilities:', error);
    return null;
  }
}

/**
 * Creates a Prompt API session if available
 * @returns {Promise<Object|null>} - Session object or null if not available
 */
export async function createPromptApiSession() {
  if (!isPromptApiAvailable()) {
    return null;
  }
  
  try {
    const session = await window.ai.languageModel.create({
      temperature: 0.4,
      topK: 3,
    });
    return session;
  } catch (error) {
    console.warn('Failed to create Prompt API session:', error);
    return null;
  }
}