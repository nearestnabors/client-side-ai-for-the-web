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
  
  // Show or hide the API key section
  const apiKeySection = document.getElementById('apiKeySection');
  if (apiKeySection) {
    if (geminiApiKey) {
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
  // API key management
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', saveApiKey);
  }
  
  const apiKeyInput = document.getElementById('apiKeyInput');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveApiKey();
    });
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
  
  // Comment form handling
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
  }
  
  const commentInput = document.getElementById('comment');
  if (commentInput) {
    commentInput.addEventListener('input', updateSubmitButton);
  }
  
  // Clear all comments button
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllComments);
  }
}