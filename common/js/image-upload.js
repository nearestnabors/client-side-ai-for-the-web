/**
 * Image Upload and Analysis
 * Handles file uploads, drag-and-drop, and AI-powered alt-text generation
 * Uses dependency injection for AI alt-text generation
 */

import { escapeHtml, handleError, getElement, showSuccessNotification, showStatusNotification, hideElement, showElement } from './ui-helpers.js';
import { savePostedImage } from './storage.js';

// Constants
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

let currentImageData = null;
let currentAltText = null;
let currentAnalysisController = null;
let aiGenerator = null;

/**
 * Configures the AI alt-text generator
 * @param {Function} generator - AI generator function that takes (imageData, controller) and returns Promise<string>
 */
export function setAIGenerator(generator) {
  if (typeof generator !== 'function') {
    throw new Error('AI generator must be a function');
  }
  aiGenerator = generator;
}

/**
 * Handles file selection from the file input
 * @param {Event} e - File input change event
 */
export function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

/**
 * Processes an uploaded image file
 * Validates file type and size, then displays preview
 * @param {File} file - The image file to process
 */
export function handleFile(file) {
  // Check if it's actually an image
  if (!file.type.startsWith('image/')) {
    showStatusNotification('failure', '❌ Please select an image file', 4000);
    return;
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    showStatusNotification('failure', '❌ Image file is too large. Please select a file under 10MB.', 4000);
    return;
  }
  
  // Read the file as base64 data URL
  const reader = new FileReader();
  reader.onload = (e) => {
    displayImagePreview(e.target.result, file.name);
    generateAltText(e.target.result);
  };
  reader.readAsDataURL(file);
}

/**
 * Shows the image preview and sets up the alt-text section
 * @param {string} dataUrl - Base64 data URL of the image
 * @param {string} fileName - Name of the uploaded file
 */
function displayImagePreview(dataUrl, fileName) {
  currentImageData = dataUrl;
  
  const preview = getElement('imagePreview');
  const img = getElement('previewImg');
  const uploadArea = getElement('uploadArea');
  
  // Hide the upload area once image is selected
  hideElement(uploadArea);
  
  img.src = dataUrl;
  img.alt = fileName;
  showElement(preview);
}

/**
 * Generates alt-text for an image using the configured AI provider
 * @param {string} imageData - Base64 data URL of the image
 */
export async function generateAltText(imageData) {
  // Check if AI generator is configured via dependency injection
  if (!aiGenerator) {
    updateAltTextResult('❌ No AI alt-text generator configured. Call setAIGenerator() first.');
    return;
  }
  
  // Cancel any existing analysis
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }
  
  // Create new abort controller for cancellation
  currentAnalysisController = new AbortController();
  
  // Show loading state
  const altTextResult = getElement('altTextResult');
  const regenerateBtn = getElement('btnRegenerate');
  
  altTextResult.innerHTML = `
    <div>
      🤖 Analyzing image with AI... <span class="loading"></span>
    </div>
  `;
  showElement(altTextResult);
  
  if (regenerateBtn) {
    hideElement(regenerateBtn);
  }
  
  try {
    // Call the injected AI generator
    const altText = await aiGenerator(imageData, currentAnalysisController);
    
    if (altText) {
      currentAltText = altText;
      updateAltTextResult(altText);
    } else {
      throw new Error('No alt text generated');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      updateAltTextResult('⏹️ Analysis cancelled');
    } else {
      const errorMsg = handleError(error, 'Alt text generation');
      updateAltTextResult(errorMsg);
    }
  } finally {
    currentAnalysisController = null;
  }
}


/**
 * Cancels the current image selection and returns to upload area
 */
export function cancelImageSelection() {
  
  // Cancel any ongoing analysis
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }
  
  // Hide preview and reset all elements
  const preview = getElement('imagePreview');
  const previewImg = getElement('previewImg');
  const actionsEl = getElement('altTextActions');
  const altTextResult = getElement('altTextResult');
  
  hideElement(preview);
  
  // Clear the preview image
  previewImg.src = '';
  previewImg.alt = '';
  
  hideElement(actionsEl);
  
  // Reset alt text result area
  altTextResult.innerHTML = '<div class="loading">Analyzing image with Gemini AI...</div>';
  showElement(altTextResult);
  
  // Clear alt text editor if it exists
  const altTextEditor = getElement('altTextEditor');
  if (altTextEditor) {
    altTextEditor.value = '';
  }
  
  // Show upload area again
  const uploadArea = getElement('uploadArea');
  showElement(uploadArea);
  
  // Reset file input and current data
  const fileInput = getElement('fileInput');
  fileInput.value = '';
  
  currentImageData = null;
  currentAltText = null;
}

/**
 * Updates the alt text result display and shows editing interface
 * @param {string} text - The alt text or error message to display
 */
function updateAltTextResult(text) {
  const resultEl = getElement('altTextResult');
  const actionsEl = getElement('altTextActions');
  const editorEl = getElement('altTextEditor');
  
  if (text.startsWith('❌') || text.startsWith('⏹️')) {
    // Show error state
    resultEl.innerHTML = `<div style="color: var(--color-error);">${text}</div>`;
    showElement(resultEl);
    hideElement(actionsEl);
  } else {
    // Show success state with editing interface - hide result div, show editor
    hideElement(resultEl);
    editorEl.value = text;
    showElement(actionsEl);
    
    // Make sure regenerate button is visible
    const regenerateBtn = getElement('btnRegenerate');
    if (regenerateBtn) {
      showElement(regenerateBtn);
    }
    
    // Alt text generated successfully, show editing interface
  }
}

/**
 * Handles accepting and posting the image with alt text
 */
export function acceptAndPostImage() {
  const editorEl = getElement('altTextEditor');
  const imageData = currentImageData;
  
  if (!editorEl || !imageData) {
    return;
  }
  
  const finalAltText = editorEl.value.trim();
  if (!finalAltText) {
    showStatusNotification('failure', '❌ Please provide alt text before posting the image', 4000);
    return;
  }
  
  // Posting image with alt text
  
  // Create posted image object
  const postedImage = {
    id: Date.now().toString(),
    imageData: imageData,
    altText: finalAltText,
    timestamp: new Date().toISOString()
  };
  
  // Save to posted images
  savePostedImage(postedImage);
  
  // Display in feed
  displayPostedImage(postedImage);
  
  // Show comment section
  showCommentSection();
  
  // Reset upload interface
  resetUploadInterface();
  
  // Show success notification
  showStatusNotification('success', '✅ Alt text added successfully!');
}

/**
 * Displays a posted image in the feed
 * @param {Object} imageData - The posted image data
 */
export function displayPostedImage(imageData) {
  const postedImages = getElement('postedImages');
  const imagesFeed = getElement('imagesFeed');
  
  if (!postedImages || !imagesFeed) {
    return;
  }
  
  // Show the posted images section
  showElement(postedImages);
  
  // Create image item using DOM methods for security
  const imageItem = document.createElement('div');
  imageItem.className = 'posted-image-item';
  imageItem.dataset.imageId = imageData.id;
  
  const timestamp = new Date(imageData.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  // Create image element safely
  const img = document.createElement('img');
  img.src = imageData.imageData;
  img.alt = imageData.altText; // Browser will handle escaping in alt attribute
  
  // Create meta container
  const metaDiv = document.createElement('div');
  metaDiv.className = 'posted-image-meta';
  
  const timestampSpan = document.createElement('span');
  timestampSpan.textContent = `Posted ${timestamp}`;
  metaDiv.appendChild(timestampSpan);
  
  // Assemble elements
  imageItem.appendChild(img);
  imageItem.appendChild(metaDiv);
  
  // Add to feed (newest first)
  imagesFeed.insertBefore(imageItem, imagesFeed.firstChild);
}

/**
 * Shows the comment section after an image is posted
 */
export function showCommentSection() {
  const commentSection = getElement('commentSection');
  if (commentSection) {
    showElement(commentSection);
  }
}

/**
 * Resets and hides the upload interface after posting
 */
function resetUploadInterface() {
  const uploadSection = getElement('uploadSection');
  const uploadArea = getElement('uploadArea');
  const preview = getElement('imagePreview');
  const actionsEl = getElement('altTextActions');
  const fileInput = getElement('fileInput');
  
  // Hide the entire upload section after successful posting
  hideElement(uploadSection);
  
  // Make sure upload area is visible when section is shown again
  showElement(uploadArea);
  
  hideElement(preview);
  hideElement(actionsEl);
  if (fileInput) fileInput.value = '';
  
  currentImageData = null;
  currentAltText = null;
}

/**
 * Gets the current image data
 * @returns {string|null} - The current image data URL or null if no image is selected
 */
export function getCurrentImageData() {
  return currentImageData;
}

/**
 * Gets the current alt text
 * @returns {string|null} - The current alt text or null if no alt text is available
 */
export function getCurrentAltText() {
  return currentAltText;
}

