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
 * Checks if Prompt API is available and ready in the current browser
 * Based on your working implementation
 * @returns {Promise<Object>} - Status object with availability info
 */
export async function checkPromptApiAvailability() {
  console.log('🔍 Checking Prompt API availability...');
  console.log('🔍 window.LanguageModel exists:', !!window.LanguageModel);
  console.log('🔍 window.LanguageModel type:', typeof window.LanguageModel);
  
  // Step 1: Check if the API exists at all
  if (!window.LanguageModel) {
    console.log('❌ Prompt API not supported in this browser');
    return { 
      available: false, 
      reason: 'Prompt API not supported in this browser' 
    };
  }

  console.log('✅ window.LanguageModel found');

  try {
    console.log('🔄 Calling LanguageModel.availability()...');
    // Step 2: Check the model's availability status  
    const availability = await LanguageModel.availability();
    console.log('📊 Availability received:', availability);
    
    // Convert the availability response to our expected format
    const capabilities = { available: availability };
    
    switch (capabilities.available) {
      case 'readily':
      case 'available':
        // Model is downloaded and ready to use
        console.log('✅ Prompt API ready for use!');
        return { available: true, ready: true };
        
      case 'after-download':
        // API exists but model needs to download first
        console.log('⬇️ Prompt API available but needs model download');
        return { 
          available: true, 
          ready: false, 
          needsDownload: true 
        };
        
      case 'no':
      default:
        // API exists but model isn't available on this device
        console.log('❌ Model not available on this device, status:', capabilities.available);
        return { 
          available: false, 
          reason: 'Model not available on this device' 
        };
    }
  } catch (error) {
    console.log('❌ Error checking capabilities:', error);
    console.log('❌ Error stack:', error.stack);
    return { 
      available: false, 
      reason: `Error checking capabilities: ${error.message}` 
    };
  }
}

/**
 * Simple sync check for backwards compatibility
 * @returns {boolean} - True if Prompt API exists (not necessarily ready)
 */
export function isPromptApiAvailable() {
  return !!(window.LanguageModel);
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
    const availability = await LanguageModel.availability();
    return { available: availability };
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
    const session = await LanguageModel.create({
      temperature: 0.4,
      topK: 3
    });
    return session;
  } catch (error) {
    console.warn('Failed to create Prompt API session:', error);
    return null;
  }
}