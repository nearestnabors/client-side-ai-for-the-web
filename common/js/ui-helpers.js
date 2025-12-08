/**
 * UI Helper Functions
 * Contains utility functions for managing UI state and interactions
 */

import { getApiKey } from './api-key.js';

// Constants
const DEFAULT_NOTIFICATION_DURATION = 3000;
const NOTIFICATION_FADE_DURATION = 300;

// DOM element cache for improved performance
const domCache = new Map();

// Event handler registry to avoid circular dependencies
const eventHandlers = new Map();

/**
 * Gets a DOM element by ID with caching for improved performance
 * @param {string} id - The element ID
 * @returns {Element|null} - The DOM element or null if not found
 */
export function getElement(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Element ID must be a non-empty string');
  }
  
  if (!domCache.has(id)) {
    const element = document.getElementById(id);
    domCache.set(id, element);
  }
  const cachedElement = domCache.get(id);
  
  // If cached element is null or no longer in DOM, refresh cache
  if (cachedElement === null || (cachedElement && !document.contains(cachedElement))) {
    const freshElement = document.getElementById(id);
    domCache.set(id, freshElement);
    return freshElement;
  }
  
  return cachedElement;
}

/**
 * Clears the DOM cache (useful for dynamic content changes)
 */
export function clearDOMCache() {
  domCache.clear();
}

/**
 * Safely executes a function on a DOM element if it exists
 * @param {string} id - The element ID
 * @param {Function} callback - Function to execute with the element
 * @returns {boolean} - True if element exists and callback was executed
 */
export function safeElementOperation(id, callback) {
  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
  
  const element = getElement(id);
  if (element && element !== null) {
    try {
      callback(element);
      return true;
    } catch (error) {
      handleError(error, `safeElementOperation for '${id}'`);
      return false;
    }
  }
  // Element not found, operation skipped
  return false;
}

/**
 * Utility functions for element visibility management using CSS classes
 */
export function hideElement(elementOrId) {
  const element = typeof elementOrId === 'string' ? getElement(elementOrId) : elementOrId;
  if (element) {
    element.classList.add('hidden');
    element.classList.remove('visible-block', 'visible-flex');
  }
}

export function showElement(elementOrId, displayType = 'block') {
  const element = typeof elementOrId === 'string' ? getElement(elementOrId) : elementOrId;
  if (element) {
    element.classList.remove('hidden');
    if (displayType === 'flex') {
      element.classList.add('visible-flex');
      element.classList.remove('visible-block');
    } else {
      element.classList.add('visible-block');
      element.classList.remove('visible-flex');
    }
  }
}

export function toggleElement(elementOrId, displayType = 'block') {
  const element = typeof elementOrId === 'string' ? getElement(elementOrId) : elementOrId;
  if (element) {
    if (element.classList.contains('hidden')) {
      showElement(element, displayType);
    } else {
      hideElement(element);
    }
  }
}

/**
 * Updates the submit button state based on API key availability and comment text
 */
export function updateSubmitButton() {
  safeElementOperation('comment', (commentEl) => {
    safeElementOperation('btnSubmit', (submitBtn) => {
      const comment = commentEl.value.trim();
      submitBtn.disabled = !getApiKey() || !comment;
    });
  });
}

/**
 * Updates the overall UI state based on API key availability
 * Shows/hides API key configuration section
 */
export function updateUIState() {
  updateSubmitButton();
  
  // Show or hide the API key section based on API key availability
  const hasApiKey = !!getApiKey();
  // Update UI state based on API key availability
  
  safeElementOperation('apiKeySection', (apiKeySection) => {
    if (hasApiKey) {
      hideElement(apiKeySection);
    } else {
      showElement(apiKeySection);
    }
  });
}

/**
 * Escapes HTML characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    throw new Error('Text to escape must be a string');
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Standardized error handling and logging
 * @param {Error} error - The error to handle
 * @param {string} context - Context description for debugging
 * @param {Function} callback - Optional callback for custom error handling
 */
export function handleError(error, context, callback = null) {
  if (!error || typeof error.message !== 'string') {
    throw new Error('Error object with message property is required');
  }
  if (typeof context !== 'string') {
    throw new Error('Context must be a string');
  }
  
  const errorMsg = `❌ ${context}: ${error.message}`;
  console.error(errorMsg, error);
  
  if (callback) {
    callback(error, context);
  }
  
  return errorMsg;
}

/**
 * Creates standardized API error messages
 * @param {Response} response - Fetch response object
 * @param {string} context - Context of the API call
 * @returns {string} - Formatted error message
 */
export function createApiError(response, context) {
  if (!response || typeof response.status === 'undefined') {
    throw new Error('Response object with status property is required');
  }
  if (typeof context !== 'string') {
    throw new Error('Context must be a string');
  }
  
  return `${context} failed (${response.status}): ${response.statusText}`;
}


/**
 * Registers an event handler to avoid circular dependencies
 * @param {string} name - Handler name
 * @param {Function} handler - Handler function
 */
export function registerEventHandler(name, handler) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Handler name must be a non-empty string');
  }
  if (typeof handler !== 'function') {
    throw new Error('Handler must be a function');
  }
  
  eventHandlers.set(name, handler);
}

/**
 * Gets a registered event handler
 * @param {string} name - Handler name
 * @returns {Function|null} - Handler function or null if not found
 */
function getEventHandler(name) {
  return eventHandlers.get(name) || null;
}

/**
 * Sets up all event listeners for the application
 */
export function setupEventListeners() {
  setupEventListenersInternal();
}

function setupEventListenersInternal() {
  // Get handlers from registry
  const handleFileSelect = getEventHandler('handleFileSelect');
  const handleFile = getEventHandler('handleFile');
  const generateAltText = getEventHandler('generateAltText');
  const acceptAndPostImage = getEventHandler('acceptAndPostImage');
  const cancelImageSelection = getEventHandler('cancelImageSelection');
  const getCurrentImageData = getEventHandler('getCurrentImageData');
  const handleCommentSubmit = getEventHandler('handleCommentSubmit');
  
  // Image upload functionality
  const uploadArea = getElement('uploadArea');
  const fileInput = getElement('fileInput');
  
  if (uploadArea && fileInput && handleFileSelect) {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      handleFileSelect(e);
    });
  }
  // Note: Upload area or file input may not exist on all pages
  
  // Drag and drop for image upload  
  if (uploadArea && handleFile) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    });
  }
  
  // Alt text regeneration
  const regenerateBtn = getElement('btnRegenerate');
  if (regenerateBtn && generateAltText && getCurrentImageData) {
    regenerateBtn.addEventListener('click', () => {
      
      // Hide the current textarea during regeneration
      const actionsEl = getElement('altTextActions');
      const resultEl = getElement('altTextResult');
      
      hideElement(actionsEl);
      if (resultEl) {
        showElement(resultEl);
        resultEl.innerHTML = `<div>🔄 Regenerating alt text... <span class="loading"></span></div>`;
      }
      
      // Call the alt text generation function with current image data
      const imageData = getCurrentImageData();
      if (imageData) {
        generateAltText(imageData);
      } else {
        handleError(new Error('generateAltText or currentImageData not available'), 'Alt text regeneration');
        // Show error and restore interface
        if (resultEl) {
          resultEl.innerHTML = `<div style="color: var(--color-error);">❌ Unable to regenerate - image data not available</div>`;
        }
        showElement(actionsEl);
      }
    });
  }
  
  // Accept and post image
  const acceptBtn = getElement('btnAccept');
  if (acceptBtn && acceptAndPostImage) {
    acceptBtn.addEventListener('click', () => {
      acceptAndPostImage();
    });
  }
  
  // Cancel image selection
  const cancelBtn = getElement('btnCancel');
  if (cancelBtn && cancelImageSelection) {
    cancelBtn.addEventListener('click', () => {
      cancelImageSelection();
    });
  }
  
  // Comment form handling
  const commentForm = getElement('commentForm');
  if (commentForm && handleCommentSubmit) {
    commentForm.addEventListener('submit', async (e) => {
      try {
        await handleCommentSubmit(e);
      } catch (error) {
        console.error('❌ Error in comment submit handler:', error);
        handleError(error, 'Comment submission');
      }
    });
  }
  
  const commentInput = getElement('comment');
  if (commentInput) {
    commentInput.addEventListener('input', updateSubmitButton);
  }
  
  // All event listeners setup complete
}

/**
 * Shows a status notification that slides in and fades out
 * @param {string} type - The notification type: 'success' or 'failure'
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the notification (default 3000ms)
 */
export function showStatusNotification(type, message, duration = DEFAULT_NOTIFICATION_DURATION) {
  if (typeof type !== 'string' || !type.trim()) {
    throw new Error('Notification type must be a non-empty string');
  }
  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('Notification message must be a non-empty string');
  }
  if (typeof duration !== 'number' || duration <= 0) {
    throw new Error('Duration must be a positive number');
  }
  
  // Remove any existing notifications
  const existingNotification = document.querySelector('.status-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `status-notification ${type}`;
  notification.textContent = message;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Trigger show animation
  requestAnimationFrame(() => {
    notification.classList.add('show');
  });
  
  // Schedule fade out and removal
  setTimeout(() => {
    notification.classList.add('fade-out');
    notification.classList.remove('show');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, NOTIFICATION_FADE_DURATION); // Match CSS transition duration
  }, duration);
}

/**
 * Shows a success notification that slides in and fades out (backward compatibility)
 * @param {string} message - The success message to display
 * @param {number} duration - How long to show the notification (default 3000ms)
 */
export function showSuccessNotification(message, duration = DEFAULT_NOTIFICATION_DURATION) {
  showStatusNotification('success', message, duration);
}
