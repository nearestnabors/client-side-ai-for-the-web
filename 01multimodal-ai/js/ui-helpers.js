/**
 * UI Helper Functions
 * Contains utility functions for managing UI state and interactions
 */

/**
 * Updates the submit button state based on API key availability and comment text
 */
function updateSubmitButton() {
  const commentEl = document.getElementById('comment');
  const submitBtn = document.getElementById('submitBtn');
  if (!commentEl || !submitBtn) {
    return;
  }
  const comment = commentEl.value.trim();
  submitBtn.disabled = !geminiApiKey || !comment;
}

/**
 * Updates the overall UI state based on API key availability
 * Shows/hides API key configuration section
 */
function updateUIState() {
  updateSubmitButton();
  
  // Show or hide the API key section based on API key availability
  const apiKeySection = document.getElementById('apiKeySection');
  if (apiKeySection) {
    const hasApiKey = isApiKeyAvailable && isApiKeyAvailable() || !!geminiApiKey;
    console.log(`🔍 Updating UI state - API key available: ${hasApiKey}`);
    
    if (hasApiKey) {
      apiKeySection.style.display = 'none';
    } else {
      apiKeySection.style.display = 'block';
    }
  }
}

/**
 * Escapes HTML characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sets up all event listeners for the application
 */
function setupEventListeners() {
  // API key management - use the dedicated function from api-key.js
  if (typeof setupApiKeyEventListeners === 'function') {
    setupApiKeyEventListeners();
  }
  
  // Image upload functionality
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop for image upload
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
  const regenerateBtn = document.getElementById('regenerateAltText');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      if (currentImageData) {
        generateAltText(currentImageData);
      }
    });
  }
  
  // Accept and post image
  const acceptBtn = document.getElementById('acceptAltText');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', acceptAndPostImage);
  }
  
  // Cancel image selection
  const cancelBtn = document.getElementById('cancelImageBtn');
  if (cancelBtn) {
    console.log('🔌 Setting up cancel image button event listener');
    cancelBtn.addEventListener('click', () => {
      console.log('🖱️ Cancel image button clicked');
      if (typeof cancelImageSelection === 'function') {
        cancelImageSelection();
      } else {
        console.error('❌ cancelImageSelection function not found');
      }
    });
  } else {
    console.warn('⚠️ Cancel image button not found during setup');
  }
  
  // Comment form handling
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
  }
  
  const commentInput = document.getElementById('comment');
  if (commentInput) {
    commentInput.addEventListener('input', updateSubmitButton);
  }
  
}