/**
 * API Key Management Module
 * 
 * Comprehensive API key handling with validation, secure storage, and UI management.
 * Educational code with detailed logging and error handling for web.dev tutorial.
 * Uses simple functions instead of classes for accessibility to novice developers.
 */

// Global variable to store the current API key
let geminiApiKey = null;

// Constant for the masked display of API keys
const MASKED_KEY_DISPLAY = '••••••••••••••••••••••••••••••••••••••••';

/**
 * Loads the saved API key from localStorage when the page loads
 * Automatically updates the UI to reflect the key status
 */
function loadApiKey() {
  console.log('📂 Loading saved API key from localStorage...');
  const saved = localStorage.getItem('geminiApiKey');
  
  if (saved) {
    console.log('✅ API key found in storage');
    geminiApiKey = saved;
    
    // Mask the key in the input field for security
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.value = MASKED_KEY_DISPLAY;
    }
    
    updateApiStatus('✅ Google AI API key configured. Ready to analyze images and comments!', 'available');
  } else {
    console.log('⚠️ No saved API key found');
    updateApiStatus('🔑 Enter your Google AI API key to get started', 'unavailable');
  }
}

/**
 * Validates and saves a new API key
 * Performs comprehensive validation and provides helpful error messages
 * @param {string} customKey - Optional key to save (if not provided, gets from input field)
 * @returns {boolean} - True if key was successfully saved, false otherwise
 */
function saveApiKey(customKey = null) {
  console.log('💾 Attempting to save API key...');
  
  // Get the API key from parameter or input field
  let key = customKey;
  if (!key) {
    const input = document.getElementById('apiKeyInput');
    if (!input) {
      console.error('❌ API key input element not found');
      return false;
    }
    key = input.value.trim();
  }
  
  // Check if key is empty or still masked
  if (!key || key === MASKED_KEY_DISPLAY) {
    console.warn('⚠️ Invalid API key: empty or masked');
    alert('Please enter a valid API key');
    return false;
  }
  
  // Validate Google AI key format - Google AI keys start with 'AIza'
  if (!key.startsWith('AIza')) {
    console.warn('⚠️ Invalid API key format');
    alert('Invalid API key format. Google AI keys should start with "AIza"');
    return false;
  }
  
  console.log('✅ API key validation passed, saving to localStorage...');
  
  // Save to localStorage and update global variable
  localStorage.setItem('geminiApiKey', key);
  geminiApiKey = key;
  
  // Mask the key in the input field for security
  const input = document.getElementById('apiKeyInput');
  if (input) {
    input.value = MASKED_KEY_DISPLAY;
  }
  
  updateApiStatus('✅ API key saved! Ready to analyze images and comments.', 'available');
  
  // Update overall UI state if the function exists
  if (typeof updateUIState === 'function') {
    updateUIState();
  }
  
  console.log('🎉 API key successfully saved and UI updated');
  return true;
}

/**
 * Gets the current API key
 * @returns {string|null} - The current API key or null if not set
 */
function getApiKey() {
  return geminiApiKey;
}

/**
 * Checks if an API key is currently configured and available
 * @returns {boolean} - True if API key is available, false otherwise
 */
function isApiKeyAvailable() {
  const available = !!geminiApiKey;
  console.log(`🔍 API key availability check: ${available ? 'available' : 'not available'}`);
  return available;
}

/**
 * Updates the API status display in the UI
 * @param {string} message - The status message to display
 * @param {string} type - The status type ('available' or 'unavailable') for styling
 */
function updateApiStatus(message, type) {
  const statusEl = document.getElementById('apiStatus');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `api-status ${type}`;
    console.log(`📱 API status updated: ${message}`);
  } else {
    console.error('❌ API status element not found in DOM');
  }
}

/**
 * Sets up event listeners for API key input and save button
 * This function should be called during app initialization
 */
function setupApiKeyEventListeners() {
  console.log('🔌 Setting up API key event listeners...');
  
  const saveButton = document.getElementById('saveApiKey');
  const input = document.getElementById('apiKeyInput');

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      console.log('🖱️ Save API key button clicked');
      saveApiKey();
    });
  } else {
    console.warn('⚠️ Save API key button not found');
  }

  if (input) {
    // Allow saving with Enter key for better UX
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        console.log('⌨️ Enter key pressed in API key input');
        saveApiKey();
      }
    });
  } else {
    console.warn('⚠️ API key input field not found');
  }
}

/**
 * Clears the saved API key and resets the UI
 * Useful for testing or when user wants to use a different key
 */
function clearApiKey() {
  console.log('🗑️ Clearing saved API key...');
  
  localStorage.removeItem('geminiApiKey');
  geminiApiKey = null;
  
  const input = document.getElementById('apiKeyInput');
  if (input) {
    input.value = '';
  }
  
  updateApiStatus('🔑 Enter your Google AI API key to get started', 'unavailable');
  console.log('✅ API key cleared successfully');
}