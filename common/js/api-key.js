/**
 * API Key Management Module
 * 
 * Comprehensive API key handling with validation, secure storage, and UI management.
 * Educational code with detailed logging and error handling for web.dev tutorial.
 * Uses ES6 modules for better code organization.
 */

// Note: Cannot import getElement due to circular dependency
// We'll use document.getElementById directly in this module

import { showSuccessNotification, showStatusNotification, clearDOMCache, hideElement, showElement } from './ui-helpers.js';

// API key storage
let geminiApiKey = null;

// Constant for the masked display of API keys
const MASKED_KEY_DISPLAY = '••••••••••••••••••••••••••••••••••••••••';

/**
 * Loads the saved API key from localStorage when the page loads
 * Automatically updates the UI to reflect the key status
 */
export function loadApiKey() {
  const saved = localStorage.getItem('geminiApiKey');
  
  if (saved) {
    // API key found in storage, set up the application
    geminiApiKey = saved;
    
    // Remove the API configuration pane from DOM entirely for security
    const apiKeySection = document.getElementById('apiKeySection');
    if (apiKeySection) {
      apiKeySection.remove();
      // Clear DOM cache since elements were removed
      clearDOMCache();
    }
    
    // Show success notification
    showStatusNotification('success', '🔑 API key ready! You can now analyze images.');
    
    // Show upload section since API key is available
    showUploadSection();
  } else {
    // No saved API key found, show configuration
    // Hide upload section until API key is configured
    hideUploadSection();
    // Show API key configuration section
    showApiKeySection();
  }
}

/**
 * Validates and saves a new API key
 * Performs comprehensive validation and provides helpful error messages
 * @param {string} customKey - Optional key to save (if not provided, gets from input field)
 * @returns {boolean} - True if key was successfully saved, false otherwise
 */
export function saveApiKey(customKey = null) {
  
  // Get the API key from parameter or input field
  let key = customKey;
  if (!key) {
    const input = document.getElementById('apiKeyInput');
    key = input.value.trim();
  }
  
  // Check if key is empty or still masked
  if (!key || key === MASKED_KEY_DISPLAY) {
    showStatusNotification('failure', '❌ Please enter a valid API key', 4000);
    return false;
  }
  
  // Validate Google AI key format - Google AI keys start with 'AIza'
  if (!key.startsWith('AIza')) {
    // Google AI keys start with 'AIza'
    showStatusNotification('failure', '❌ Invalid API key format. Google AI keys should start with "AIza"', 4000);
    return false;
  }
  
  // API key validation passed, save to localStorage
  
  // Save to localStorage and update module variable
  localStorage.setItem('geminiApiKey', key);
  geminiApiKey = key;
  
  // Mask the key in the input field for security
  const input = document.getElementById('apiKeyInput');
  input.value = MASKED_KEY_DISPLAY;
  
  // Remove the API configuration pane from DOM entirely for security
  const apiKeySection = document.getElementById('apiKeySection');
  if (apiKeySection) {
    apiKeySection.remove();
    // Clear DOM cache since elements were removed
    clearDOMCache();
  }
  
  // Show success notification
  showStatusNotification('success', '🔑 API key saved successfully!');
  
  // Show upload section since API key is now available
  showUploadSection();
  
  // API key successfully saved and UI updated
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
  return !!geminiApiKey;
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
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `api-status ${type}`;
    showElement(statusEl);
  }
}

/**
 * Hides the API status display with a smooth fade effect
 */
function hideApiStatus() {
  const statusEl = document.getElementById('apiStatus');
  if (statusEl && statusEl.classList.contains('available')) {
    // Auto-hide API status message after 5 seconds
    statusEl.classList.add('fade-out');
    
    setTimeout(() => {
      hideElement(statusEl);
      statusEl.classList.remove('fade-out');
    }, 500);
  }
}

/**
 * Sets up event listeners for API key input and save button
 * This function should be called during app initialization
 */
export function setupApiKeyEventListeners() {
  
  const saveButton = document.getElementById('btnSave');
  const input = document.getElementById('apiKeyInput');

  // Check if elements exist before adding listeners (they may have been removed if API key is already saved)
  if (saveButton && input) {
    saveButton.addEventListener('click', () => {
      saveApiKey();
    });

    // Allow saving with Enter key for better UX
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveApiKey();
      }
    });
  }
  // Note: API key elements may not exist if key is already configured and removed
}

/**
 * Clears the saved API key and resets the UI
 * Useful for testing or when user wants to use a different key
 */
export function clearApiKey() {
  
  localStorage.removeItem('geminiApiKey');
  geminiApiKey = null;
  
  const input = document.getElementById('apiKeyInput');
  if (input) {
    input.value = '';
  }
  
  // Hide upload section since no API key is available
  hideUploadSection();
}

/**
 * Shows the upload section when API key is available
 */
function showUploadSection() {
  const uploadSection = document.getElementById('uploadSection');
  if (uploadSection) {
    showElement(uploadSection);
  }
}

/**
 * Shows the API key configuration section when no key is found
 */
function showApiKeySection() {
  const apiKeySection = document.getElementById('apiKeySection');
  if (apiKeySection) {
    showElement(apiKeySection);
  }
}

/**
 * Hides the upload section when no API key is configured
 */
function hideUploadSection() {
  const uploadSection = document.getElementById('uploadSection');
  if (uploadSection) {
    hideElement(uploadSection);
  }
}
