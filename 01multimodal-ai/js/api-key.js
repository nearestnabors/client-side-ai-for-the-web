/**
 * API Key Management Module
 * 
 * Comprehensive API key handling with validation, secure storage, and UI management.
 * Educational code with detailed logging and error handling for web.dev tutorial.
 * Uses ES6 modules for better code organization.
 */

// Note: Cannot import getElement due to circular dependency
// We'll use document.getElementById directly in this module

// API key storage
let geminiApiKey = null;

// Constant for the masked display of API keys
const MASKED_KEY_DISPLAY = '••••••••••••••••••••••••••••••••••••••••';

/**
 * Loads the saved API key from localStorage when the page loads
 * Automatically updates the UI to reflect the key status
 */
export function loadApiKey() {
  console.log('📂 Loading saved API key from localStorage...');
  const saved = localStorage.getItem('geminiApiKey');
  
  if (saved) {
    console.log('✅ API key found in storage');
    geminiApiKey = saved;
    window.geminiApiKey = saved;
    
    // Remove the API configuration pane from DOM entirely for security
    const apiKeySection = document.getElementById('apiKeySection');
    apiKeySection.remove();
    
    updateApiStatus({ message: '✅ Google AI API key configured. Ready to analyze images and comments!', type: 'available' });
    
    // Auto-hide the success message after 5 seconds
    setTimeout(() => {
      hideApiStatus();
    }, 5000);
  } else {
    console.log('⚠️ No saved API key found');
    updateApiStatus({ message: '🔑 Enter your Google AI API key to get started', type: 'unavailable' });
  }
}

/**
 * Validates and saves a new API key
 * Performs comprehensive validation and provides helpful error messages
 * @param {string} customKey - Optional key to save (if not provided, gets from input field)
 * @returns {boolean} - True if key was successfully saved, false otherwise
 */
export function saveApiKey(customKey = null) {
  console.log('💾 Attempting to save API key...');
  
  // Get the API key from parameter or input field
  let key = customKey;
  if (!key) {
    const input = document.getElementById('apiKeyInput');
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
  window.geminiApiKey = key;
  
  // Mask the key in the input field for security
  const input = document.getElementById('apiKeyInput');
  input.value = MASKED_KEY_DISPLAY;
  
  // Remove the API configuration pane from DOM entirely for security
  const apiKeySection = document.getElementById('apiKeySection');
  apiKeySection.remove();
  
  updateApiStatus({ message: '✅ API key saved! Ready to analyze images and comments.', type: 'available' });
  
  // Auto-hide the success message after 5 seconds
  setTimeout(() => {
    hideApiStatus();
  }, 5000);
  
  console.log('🔑 Global geminiApiKey updated:', !!geminiApiKey);
  console.log('🎉 API key successfully saved and UI updated');
  return true;
}

/**
 * Gets the current API key
 * @returns {string|null} - The current API key or null if not set
 */
export function getApiKey() {
  return geminiApiKey;
}

/**
 * Checks if an API key is currently configured and available
 * @returns {boolean} - True if API key is available, false otherwise
 */
export function isApiKeyAvailable() {
  const available = !!geminiApiKey;
  console.log(`🔍 API key availability check: ${available ? 'available' : 'not available'}`);
  return available;
}

/**
 * Updates the API status display in the UI
 * @param {Object} config - Status configuration object
 * @param {string} config.message - The status message to display
 * @param {string} config.type - The status type ('available' or 'unavailable') for styling
 */
function updateApiStatus(config) {
  const { message, type } = config;
  const statusEl = document.getElementById('apiStatus');
  statusEl.textContent = message;
  statusEl.className = `api-status ${type}`;
  statusEl.style.display = 'block';
  console.log(`📱 API status updated: ${message}`);
}

/**
 * Hides the API status display with a smooth fade effect
 */
function hideApiStatus() {
  const statusEl = document.getElementById('apiStatus');
  if (statusEl && statusEl.classList.contains('available')) {
    console.log('⏰ Auto-hiding API status message after 5 seconds');
    statusEl.style.transition = 'opacity 0.5s ease-out';
    statusEl.style.opacity = '0';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
      statusEl.style.opacity = '1'; // Reset for next time
      statusEl.style.transition = '';
    }, 500);
  }
}

/**
 * Sets up event listeners for API key input and save button
 * This function should be called during app initialization
 */
export function setupApiKeyEventListeners() {
  console.log('🔌 Setting up API key event listeners...');
  
  const saveButton = document.getElementById('saveApiKey');
  const input = document.getElementById('apiKeyInput');

  saveButton.addEventListener('click', () => {
    console.log('🖱️ Save API key button clicked');
    saveApiKey();
  });

  // Allow saving with Enter key for better UX
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      console.log('⌨️ Enter key pressed in API key input');
      saveApiKey();
    }
  });
}

/**
 * Clears the saved API key and resets the UI
 * Useful for testing or when user wants to use a different key
 */
export function clearApiKey() {
  console.log('🗑️ Clearing saved API key...');
  
  localStorage.removeItem('geminiApiKey');
  geminiApiKey = null;
  window.geminiApiKey = null;
  
  const input = document.getElementById('apiKeyInput');
  input.value = '';
  
  updateApiStatus({ message: '🔑 Enter your Google AI API key to get started', type: 'unavailable' });
  console.log('✅ API key cleared successfully');
}

// Make API key available globally for other modules
window.geminiApiKey = geminiApiKey;