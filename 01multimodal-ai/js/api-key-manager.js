/**
 * API Key Management Module
 * 
 * Handles secure storage, validation, and management of Google AI API keys.
 * Provides functions to save, load, and validate API keys with proper security measures.
 */

class ApiKeyManager {
  constructor() {
    this.apiKey = null;
    this.storageKey = 'geminiApiKey';
  }

  /**
   * Loads the API key from localStorage on app startup
   * Automatically updates the UI to reflect the key status
   */
  loadApiKey() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.apiKey = saved;
      // Mask the key in the input field for security
      const input = document.getElementById('apiKeyInput');
      if (input) {
        input.value = '••••••••••••••••••••••••••••••••••••••••';
      }
      this.updateApiStatus('✅ Google AI API key configured. Ready to analyze images and comments!', 'available');
    } else {
      this.updateApiStatus('🔑 Enter your Google AI API key to get started', 'unavailable');
    }
  }

  /**
   * Validates and saves a new API key
   * Performs basic validation to ensure the key format is correct
   * @param {string} key - The API key to validate and save
   * @returns {boolean} - True if key was successfully saved, false otherwise
   */
  saveApiKey(key) {
    // Trim whitespace and check for empty key
    const trimmedKey = key.trim();
    if (!trimmedKey || trimmedKey === '••••••••••••••••••••••••••••••••••••••••') {
      alert('Please enter a valid API key');
      return false;
    }

    // Basic validation - Google AI keys start with 'AIza'
    if (!trimmedKey.startsWith('AIza')) {
      alert('Invalid API key format. Google AI keys should start with "AIza"');
      return false;
    }

    // Save to localStorage and update instance
    localStorage.setItem(this.storageKey, trimmedKey);
    this.apiKey = trimmedKey;
    
    // Mask the key in the input field
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.value = '••••••••••••••••••••••••••••••••••••••••';
    }
    
    this.updateApiStatus('✅ API key saved! Ready to analyze images and comments.', 'available');
    return true;
  }

  /**
   * Gets the current API key
   * @returns {string|null} - The current API key or null if not set
   */
  getApiKey() {
    return this.apiKey;
  }

  /**
   * Checks if an API key is currently configured
   * @returns {boolean} - True if API key is available, false otherwise
   */
  isApiKeyAvailable() {
    return !!this.apiKey;
  }

  /**
   * Updates the API status display in the UI
   * @param {string} message - The status message to display
   * @param {string} type - The status type ('available' or 'unavailable')
   */
  updateApiStatus(message, type) {
    const statusEl = document.getElementById('apiStatus');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `api-status ${type}`;
    }
  }

  /**
   * Sets up event listeners for API key input and save button
   */
  setupEventListeners() {
    const saveButton = document.getElementById('saveApiKey');
    const input = document.getElementById('apiKeyInput');

    if (saveButton) {
      saveButton.addEventListener('click', () => {
        if (input) {
          this.saveApiKey(input.value);
        }
      });
    }

    if (input) {
      // Allow saving with Enter key
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveApiKey(input.value);
        }
      });
    }
  }

  /**
   * Clears the saved API key and resets the UI
   */
  clearApiKey() {
    localStorage.removeItem(this.storageKey);
    this.apiKey = null;
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.value = '';
    }
    this.updateApiStatus('🔑 Enter your Google AI API key to get started', 'unavailable');
  }
}

// Export for use in other modules
window.ApiKeyManager = ApiKeyManager;