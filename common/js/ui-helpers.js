/**
 * UI Helper Functions
 * Contains utility functions for managing UI state and interactions
 */

// DOM element cache for improved performance
const domCache = new Map();

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
  console.log(`ℹ️ Element '${id}' not found - operation skipped`);
  return false;
}

/**
 * Updates the submit button state based on API key availability and comment text
 */
export function updateSubmitButton() {
  safeElementOperation('comment', (commentEl) => {
    safeElementOperation('btnSubmit', (submitBtn) => {
      const comment = commentEl.value.trim();
      submitBtn.disabled = !window.geminiApiKey || !comment;
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
  const hasApiKey = !!window.geminiApiKey;
  console.log(`🔍 Updating UI state - API key available: ${hasApiKey}`);
  
  safeElementOperation('apiKeySection', (apiKeySection) => {
    if (hasApiKey) {
      apiKeySection.style.display = 'none';
    } else {
      apiKeySection.style.display = 'block';
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
 * Sets up all event listeners for the application
 */
export function setupEventListeners() {
  console.log('🔌 Setting up event listeners...');
  
  // Image upload functionality
  const uploadArea = getElement('uploadArea');
  const fileInput = getElement('fileInput');
  
  console.log('🔍 Upload elements:', { uploadArea: !!uploadArea, fileInput: !!fileInput });
  
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      console.log('📁 File input change detected');
      if (window.handleFileSelect) {
        window.handleFileSelect(e);
      } else {
        console.error('❌ window.handleFileSelect not available');
      }
    });
    console.log('✅ Upload area and file input event listeners attached');
  } else {
    console.error('❌ Upload area or file input not found');
  }
  
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
        if (window.handleFile) {
          window.handleFile(files[0]);
        } else {
          console.error('❌ window.handleFile not available');
        }
      }
    });
  }
  
  // Alt text regeneration
  const regenerateBtn = getElement('btnRegenerate');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      console.log('🔄 Regenerating alt text...');
      
      // Hide the current textarea during regeneration
      const actionsEl = getElement('altTextActions');
      const resultEl = getElement('altTextResult');
      
      if (actionsEl) actionsEl.style.display = 'none';
      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = `<div>🔄 Regenerating alt text... <span class="loading"></span></div>`;
      }
      
      // Call the alt text generation function with current image data
      if (window.currentImageData && window.generateAltText) {
        window.generateAltText(window.currentImageData);
      } else {
        console.error('❌ generateAltText or currentImageData not available');
        // Show error and restore interface
        if (resultEl) {
          resultEl.innerHTML = `<div style="color: #c62828;">❌ Unable to regenerate - image data not available</div>`;
        }
        if (actionsEl) actionsEl.style.display = 'block';
      }
    });
  }
  
  // Accept and post image
  const acceptBtn = getElement('btnAccept');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      if (window.acceptAndPostImage) {
        window.acceptAndPostImage();
      } else {
        console.error('❌ acceptAndPostImage not available');
      }
    });
  }
  
  // Cancel image selection
  const cancelBtn = getElement('btnCancel');
  if (cancelBtn) {
    console.log('🔌 Setting up cancel image button event listener');
    cancelBtn.addEventListener('click', () => {
      console.log('🖱️ Cancel image button clicked');
      if (window.cancelImageSelection) {
        window.cancelImageSelection();
      } else {
        console.error('❌ cancelImageSelection function not found');
      }
    });
  }
  
  // Comment form handling
  const commentForm = getElement('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', (e) => {
      if (window.handleCommentSubmit) {
        window.handleCommentSubmit(e);
      } else {
        console.error('❌ handleCommentSubmit not available');
      }
    });
  }
  
  const commentInput = getElement('comment');
  if (commentInput) {
    commentInput.addEventListener('input', updateSubmitButton);
  }
  
  console.log('✅ All event listeners setup complete');
}

/**
 * Shows a success notification that slides in and fades out
 * @param {string} message - The success message to display
 * @param {number} duration - How long to show the notification (default 3000ms)
 */
export function showSuccessNotification(message, duration = 3000) {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.success-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'success-notification';
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
  
  console.log('✅ Success notification shown:', message);
}

// Make clearDOMCache globally available for other modules
window.clearDOMCache = clearDOMCache;