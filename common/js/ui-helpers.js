/**
 * UI Helper Functions
 * Contains utility functions for managing UI state and interactions
 */

import { getApiKey } from './api-key.js';

// DOM element cache for improved performance
const domCache = new Map();

// Import functions for event listeners (circular dependency is handled by ES6 modules)
let handleFileSelect, handleFile, generateAltText, acceptAndPostImage, cancelImageSelection, getCurrentImageData, handleCommentSubmit;

// Lazy load these to avoid circular dependency issues at module initialization
async function loadEventHandlers() {
  if (!handleFileSelect) {
    const imageUpload = await import('./image-upload.js');
    handleFileSelect = imageUpload.handleFileSelect;
    handleFile = imageUpload.handleFile;
    generateAltText = imageUpload.generateAltText;
    acceptAndPostImage = imageUpload.acceptAndPostImage;
    cancelImageSelection = imageUpload.cancelImageSelection;
    getCurrentImageData = imageUpload.getCurrentImageData;
    
    const commentModeration = await import('../../01multimodal-ai/js/comment-moderation.js');
    handleCommentSubmit = commentModeration.handleCommentSubmit;
  }
  return { handleFileSelect, handleFile, generateAltText, acceptAndPostImage, cancelImageSelection, getCurrentImageData, handleCommentSubmit };
}

/**
 * Gets a DOM element by ID with caching for improved performance
 * @param {string} id - The element ID
 * @returns {Element|null} - The DOM element or null if not found
 */
export function getElement(id) {
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
  const element = getElement(id);
  if (element && element !== null) {
    try {
      callback(element);
      return true;
    } catch (error) {
      console.error(`❌ Error in safeElementOperation for '${id}':`, error);
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
  return `${context} failed (${response.status}): ${response.statusText}`;
}

/**
 * Parses Gemini API response structure consistently
 * @param {Object} data - The API response data
 * @param {string} context - Context of the API call for error reporting
 * @returns {string} - Extracted response text
 * @throws {Error} - If response cannot be parsed
 */
export function parseGeminiResponse(data, context = 'API call') {
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
    console.error(`No response text found in ${context} response:`, data);
    console.error('Candidate object:', candidate);
    console.error('Available keys in candidate:', candidate ? Object.keys(candidate) : 'No candidate');
    console.error('Full candidate content object:', candidate?.content);
    
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

/**
 * Sets up all event listeners for the application
 */
export async function setupEventListeners() {
  // Load event handlers (handles circular dependencies)
  const handlers = await loadEventHandlers();
  setupEventListenersInternal(handlers.handleFileSelect, handlers.handleFile, handlers.generateAltText, handlers.acceptAndPostImage, handlers.cancelImageSelection, handlers.getCurrentImageData, handlers.handleCommentSubmit);
}

function setupEventListenersInternal(handleFileSelect, handleFile, generateAltText, acceptAndPostImage, cancelImageSelection, getCurrentImageData, handleCommentSubmit) {
  // Image upload functionality
  const uploadArea = getElement('uploadArea');
  const fileInput = getElement('fileInput');
  
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      handleFileSelect(e);
    });
  }
  // Note: Upload area or file input may not exist on all pages
  
  // Drag and drop for image upload  
  if (uploadArea) {
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
  if (regenerateBtn) {
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
        console.error('❌ generateAltText or currentImageData not available');
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
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      acceptAndPostImage();
    });
  }
  
  // Cancel image selection
  const cancelBtn = getElement('btnCancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      cancelImageSelection();
    });
  }
  
  // Comment form handling
  const commentForm = getElement('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', (e) => {
      handleCommentSubmit(e);
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
export function showStatusNotification(type, message, duration = 3000) {
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
    }, 300); // Match CSS transition duration
  }, duration);
}

/**
 * Shows a success notification that slides in and fades out (backward compatibility)
 * @param {string} message - The success message to display
 * @param {number} duration - How long to show the notification (default 3000ms)
 */
export function showSuccessNotification(message, duration = 3000) {
  showStatusNotification('success', message, duration);
}
