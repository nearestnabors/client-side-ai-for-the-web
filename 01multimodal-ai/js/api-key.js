/**
 * API Key Management
 * Handles validation, storage, and retrieval of Google AI API keys
 */

let geminiApiKey = null;

/**
 * Loads the saved API key from localStorage when the page loads
 * Masks the key in the input field for security
 */
function loadApiKey() {
  const saved = localStorage.getItem('geminiApiKey');
  if (saved) {
    geminiApiKey = saved;
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.value = '••••••••••••••••••••••••••••••••••••••••';
    }
    updateApiStatus('✅ Google AI API key configured. Ready to analyze images and comments!', 'available');
  } else {
    updateApiStatus('🔑 Enter your Google AI API key to get started', 'unavailable');
  }
}

/**
 * Validates and saves a new API key
 * Checks that the key starts with 'AIza' (Google's format)
 */
function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  if (!input) {
    console.error('API key input element not found');
    return;
  }
  
  const key = input.value.trim();
  
  // Check if key is empty or still masked
  if (!key || key === '••••••••••••••••••••••••••••••••••••••••') {
    alert('Please enter a valid API key');
    return;
  }
  
  // Validate Google AI key format
  if (!key.startsWith('AIza')) {
    alert('Invalid API key format. Google AI keys should start with "AIza"');
    return;
  }
  
  // Save to localStorage and update UI
  localStorage.setItem('geminiApiKey', key);
  geminiApiKey = key;
  input.value = '••••••••••••••••••••••••••••••••••••••••';
  updateApiStatus('✅ API key saved! Ready to analyze images and comments.', 'available');
  updateUIState();
}

/**
 * Updates the API status display
 * @param {string} message - Status message to show
 * @param {string} type - 'available' or 'unavailable' for styling
 */
function updateApiStatus(message, type) {
  const statusEl = document.getElementById('apiStatus');
  if (!statusEl) {
    console.error('API status element not found');
    return;
  }
  statusEl.textContent = message;
  statusEl.className = `api-status ${type}`;
}