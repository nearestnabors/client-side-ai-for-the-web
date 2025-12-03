/**
 * Client-side AI Helper Functions
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
  console.group('🔍 Chrome Prompt API Availability Check');
  console.log('Timestamp:', new Date().toISOString());
  console.log('User Agent:', navigator.userAgent);
  
  // Check if we've already verified the model is ready
  if (window.__promptApiReady) {
    console.log('✅ Model previously verified as ready via successful session creation');
    console.groupEnd();
    return { available: true, ready: true };
  }
  
  console.log('window.LanguageModel exists:', !!window.LanguageModel);
  console.log('window.LanguageModel type:', typeof window.LanguageModel);
  
  // Step 1: Check if the API exists at all
  if (!window.LanguageModel) {
    console.error('❌ Prompt API not supported in this browser');
    console.groupEnd();
    return { 
      available: false, 
      reason: 'Prompt API not supported in this browser' 
    };
  }

  console.log('✅ window.LanguageModel object found');

  try {
    // Log available methods
    console.group('📋 LanguageModel API Methods:');
    console.log('LanguageModel.create:', typeof LanguageModel.create);
    console.log('LanguageModel.availability:', typeof LanguageModel.availability);
    console.log('LanguageModel.capabilities:', typeof LanguageModel.capabilities);
    console.groupEnd();
    
    // Try capabilities API (may not exist)
    if (typeof LanguageModel.capabilities === 'function') {
      try {
        console.log('Calling LanguageModel.capabilities()...');
        const caps = await LanguageModel.capabilities();
        console.log('Capabilities response:', caps);
      } catch (e) {
        console.warn('Capabilities call failed:', e);
      }
    }
    
    // Check availability
    console.log('Calling LanguageModel.availability()...');
    const availabilityStart = performance.now();
    const availability = await LanguageModel.availability();
    const availabilityTime = performance.now() - availabilityStart;
    console.log(`Availability response received in ${availabilityTime.toFixed(2)}ms:`, availability);
    
    // Log Chrome bug details
    console.group('🐛 Chrome Bug Report Info:');
    console.log('Expected: Model should report "available" when ready (per Chrome docs)');
    console.log('Actual: Model persistently reports "downloading"');
    console.log('Chrome components status: chrome://components/ shows Optimization Guide On Device Model as "Updated"');
    console.log('Chrome flags: chrome://flags/#optimization-guide-on-device-model set to "Enabled BypassPerfRequirement"');
    console.log('Documentation: https://developer.chrome.com/docs/ai/inform-users-of-model-download');
    console.groupEnd();
    
    const result = (() => {
      switch (availability) {
        case 'readily':
          console.log('✅ Status: Model is ready for immediate use (readily)');
          return { available: true, ready: true };
          
        case 'available':
          console.log('✅ Status: Model is available and ready to use!');
          return { available: true, ready: true };
          
        case 'after-download':
        case 'downloadable':
          console.log('⬇️ Status: Model needs to be downloaded');
          return { 
            available: true, 
            ready: false, 
            needsDownload: true 
          };
        
        case 'downloading':
          console.warn('📥 Status: Model is downloading');
          console.log('Per Chrome docs, we should monitor downloadprogress events');
          
          // Try to set up download progress monitoring
          if (typeof LanguageModel.addEventListener === 'function') {
            console.log('Setting up downloadprogress event listener...');
            LanguageModel.addEventListener('downloadprogress', (e) => {
              console.log('Download progress:', e.loaded, '/', e.total);
              if (e.loaded === e.total) {
                console.log('✅ Download complete!');
              }
            });
          } else {
            console.log('Note: downloadprogress event API not available');
          }
          
          return { 
            available: true, 
            ready: false, 
            downloading: true 
          };
          
        case 'no':
          console.log('❌ Status: Model not available on this device');
          return { 
            available: false, 
            reason: 'Model not available on this device' 
          };
          
        default:
          console.error('⚠️ Unknown status value:', availability);
          return { 
            available: false, 
            reason: `Unknown status: ${availability}` 
          };
      }
    })();
    
    console.groupEnd();
    return result;
    
  } catch (error) {
    console.error('❌ Error during availability check:', error);
    console.error('Stack trace:', error.stack);
    console.groupEnd();
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
 * Checks if user activation is available for Prompt API operations
 * @returns {boolean} - True if user has recently interacted with the page
 */
export function hasUserActivation() {
  return !!(navigator.userActivation?.isActive);
}

/**
 * Gets user-friendly message about activation requirements
 * @returns {string} - Message explaining what user needs to do
 */
export function getUserActivationMessage() {
  if (hasUserActivation()) {
    return 'User activation detected - ready for client-side AI';
  }
  return 'Client-side AI requires user interaction: please click, tap, or press a key to enable model downloads';
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
 * Triggers model download when user activation is available
 * @returns {Promise<boolean>} - True if download was initiated successfully
 */
export async function triggerModelDownload() {
  if (!isPromptApiAvailable()) {
    console.log('❌ Prompt API not available');
    return false;
  }
  
  // Check for user activation per Chrome best practices
  if (!navigator.userActivation?.isActive) {
    console.warn('⚠️ User activation required for model download');
    console.log('💡 Tip: User must click, tap, or press a key before AI model can be downloaded');
    return false;
  }
  
  try {
    console.log('🚀 User activation detected, initiating model download...');
    
    // Add a reasonable timeout to prevent indefinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Model download timeout after 30 seconds')), 30000);
    });
    
    // Race between session creation and timeout
    const session = await Promise.race([
      LanguageModel.create({
        temperature: 0.4,
        topK: 3,
        systemPrompt: 'You are a helpful assistant.',
        initialPrompts: []
      }),
      timeoutPromise
    ]);
    
    if (session) {
      console.log('✅ Model downloaded and session created successfully');
      // Destroy the session as we just needed to trigger download
      if (session.destroy) {
        session.destroy();
      }
      return true;
    }
    return false;
  } catch (error) {
    if (error.message?.includes('timeout')) {
      console.warn('⏱️ Model download taking too long, will continue in background');
    } else {
      console.warn('Failed to trigger model download:', error);
    }
    return false;
  }
}

/**
 * Creates a Prompt API session if available
 * Follows Chrome best practices for user activation to trigger model downloads
 * @returns {Promise<Object|null>} - Session object or null if not available
 */
export async function createPromptApiSession() {
  if (!isPromptApiAvailable()) {
    return null;
  }
  
  // Check for user activation per Chrome best practices
  if (!navigator.userActivation?.isActive) {
    console.warn('⚠️ User activation required for Prompt API session creation');
    console.log('💡 Tip: User must click, tap, or press a key before AI model can be initialized');
    return null;
  }
  
  try {
    console.group('🔄 Creating Prompt API Session');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User activation active:', navigator.userActivation?.isActive);
    
    const startTime = performance.now();
    console.log('Calling LanguageModel.create() with parameters:', {
      temperature: 0.4,
      topK: 3,
      systemPrompt: 'You are a helpful assistant.',
      initialPrompts: []
    });
    
    const session = await LanguageModel.create({
      temperature: 0.4,
      topK: 3,
      systemPrompt: 'You are a helpful assistant.',
      initialPrompts: []
    });
    
    const elapsed = performance.now() - startTime;
    console.log(`✅ Session created successfully in ${elapsed.toFixed(2)}ms`);
    console.log('Session object:', session);
    
    // Mark globally that model is working
    if (session) {
      window.__promptApiReady = true;
      console.log('🎯 Model verified as working - future checks will skip availability API');
    }
    
    console.groupEnd();
    return session;
  } catch (error) {
    const elapsed = performance.now() - startTime;
    console.error(`❌ Session creation failed after ${elapsed.toFixed(2)}ms`);
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.groupEnd();
    return null;
  }
}

/**
 * Global flag to track if model download should be attempted on next user action
 */
let pendingModelDownload = false;

/**
 * Sets whether model download is pending
 * @param {boolean} pending - Whether download is pending
 */
export function setPendingModelDownload(pending) {
  pendingModelDownload = pending;
}

/**
 * Attempts model download if pending and user activation is available
 * Non-blocking - starts download in background and returns immediately
 * @returns {Promise<boolean>} - True if download was initiated (not necessarily completed)
 */
export async function attemptPendingDownload() {
  if (!pendingModelDownload) {
    return false;
  }
  
  // Check for user activation
  if (!navigator.userActivation?.isActive) {
    console.log('⏳ Waiting for user activation to download model...');
    return false;
  }
  
  console.log('🎯 User activation detected, starting model download in background...');
  pendingModelDownload = false; // Only try once per session
  
  // Start download in background - don't await it
  triggerModelDownload().then(success => {
    if (success) {
      console.log('✅ Model downloaded successfully! Future requests will use local AI.');
      
      // Show success notification
      const statusEl = document.getElementById('status');
      if (statusEl) {
        statusEl.className = 'status show success';
        statusEl.innerHTML = '<p>🎉 AI model downloaded! Future requests will use faster local processing.</p>';
        setTimeout(() => {
          statusEl.className = 'status';
        }, 3000);
      }
    } else {
      console.log('⚠️ Model download failed, continuing with cloud AI');
    }
  }).catch(error => {
    console.warn('Model download error:', error);
  });
  
  // Return immediately - don't wait for download
  return true;
}

/**
 * Simple helper that tries client-side AI first, then falls back to server-side
 * This is the core pattern for hybrid AI: always try to run locally first!
 * 
 * @param {Function} clientSideFunction - Function that uses client-side AI (Prompt API)
 * @param {Function} serverSideFunction - Function that uses server-side AI (Gemini)
 * @param {string} serviceName - Name of the service for logging (e.g., "image analysis")
 * @param {...any} args - Arguments to pass to both functions
 * @returns {Promise<any>} - Result from whichever AI successfully processes the request
 */
export async function tryClientSideThenServerSide(
  clientSideFunction,
  serverSideFunction,
  serviceName,
  ...args
) {
  // First, attempt any pending model download
  await attemptPendingDownload();
  // Step 1: Check if client-side AI is available
  const status = await checkPromptApiAvailability();
  
  // Step 2: Always try client-side first if API exists (even if status is "downloading")
  if (status.available) {
    try {
      console.log(`🔬 Attempting client-side ${serviceName} with Prompt API...`);
      
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Client-side timeout')), 5000);
      });
      
      const result = await Promise.race([
        clientSideFunction(...args),
        timeoutPromise
      ]);
      
      console.log(`✅ Client-side ${serviceName} successful!`);
      return result;
    } catch (error) {
      // Client-side failed or timed out
      if (error.message === 'Client-side timeout') {
        console.log(`⏱️ Client-side ${serviceName} timed out after 5s, falling back to server-side`);
      } else {
        console.log(`📥 Client-side not ready (${error.message}), using server-side`);
      }
    }
  } else {
    console.log(`ℹ️ Prompt API not available for ${serviceName}, using server-side AI`);
  }
  
  // Step 3: Fall back to server-side AI
  console.log(`☁️ Using server-side Gemini AI for ${serviceName}...`);
  const result = await serverSideFunction(...args);
  console.log(`✅ Server-side ${serviceName} successful`);
  return result;
}