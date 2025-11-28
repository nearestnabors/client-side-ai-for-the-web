/**
 * Image Upload and Analysis
 * Handles file uploads, drag-and-drop, and AI-powered alt-text generation
 * Uses dependency injection for AI alt-text generation
 */

import { escapeHtml, handleError, getElement, showSuccessNotification } from './ui-helpers.js';
import { savePostedImage } from './storage.js';

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
  console.log('🤖 AI alt-text generator configured');
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
    alert('Please select an image file');
    return;
  }
  
  // Check file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    alert('Image file is too large. Please select a file under 10MB.');
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
  uploadArea.style.display = 'none';
  console.log('📦 Upload area hidden - image selected for processing');
  
  img.src = dataUrl;
  img.alt = fileName;
  preview.style.display = 'block';
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
  altTextResult.style.display = 'block';
  
  if (regenerateBtn) {
    regenerateBtn.style.display = 'none';
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
  console.log('❌ User cancelled image selection');
  
  // Cancel any ongoing analysis
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }
  
  // Hide preview and reset all elements
  const preview = getElement('imagePreview');
  const previewImg = getElement('previewImg');
  const actionsEl = getElement('altTextActions');
  const altTextResult = getElement('altTextResult');
  
  preview.style.display = 'none';
  console.log('🔄 Image preview hidden');
  
  // Clear the preview image
  previewImg.src = '';
  previewImg.alt = '';
  console.log('🔄 Preview image cleared');
  
  if (actionsEl) {
    actionsEl.style.display = 'none';
    console.log('🔄 Alt text actions hidden');
  }
  
  // Reset alt text result area
  altTextResult.innerHTML = '<div class="loading">Analyzing image with Gemini AI...</div>';
  altTextResult.style.display = 'block';
  console.log('🔄 Alt text result area reset');
  
  // Clear alt text editor if it exists
  const altTextEditor = getElement('altTextEditor');
  if (altTextEditor) {
    altTextEditor.value = '';
    console.log('🔄 Alt text editor cleared');
  }
  
  // Show upload area again
  const uploadArea = getElement('uploadArea');
  uploadArea.style.display = 'block';
  console.log('📦 Upload area shown - user cancelled image selection');
  
  // Reset file input and current data
  const fileInput = getElement('fileInput');
  fileInput.value = '';
  console.log('🔄 File input cleared');
  
  currentImageData = null;
  currentAltText = null;
  console.log('✅ Image selection cancelled and upload area restored');
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
    resultEl.innerHTML = `<div style="color: #c62828;">${text}</div>`;
    resultEl.style.display = 'block';
    actionsEl.style.display = 'none';
  } else {
    // Show success state with editing interface - hide result div, show editor
    resultEl.style.display = 'none';
    editorEl.value = text;
    actionsEl.style.display = 'block';
    
    // Make sure regenerate button is visible
    const regenerateBtn = getElement('btnRegenerate');
    if (regenerateBtn) {
      regenerateBtn.style.display = 'block';
    }
    
    console.log('✅ Alt text generated and editing interface shown');
  }
}

/**
 * Handles accepting and posting the image with alt text
 */
export function acceptAndPostImage() {
  const editorEl = getElement('altTextEditor');
  const imageData = currentImageData;
  
  if (!editorEl || !imageData) {
    console.error('❌ Missing required elements for posting image');
    return;
  }
  
  const finalAltText = editorEl.value.trim();
  if (!finalAltText) {
    alert('Please provide alt text before posting the image');
    return;
  }
  
  console.log('📤 Posting image with alt text:', finalAltText);
  
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
  window.displayPostedImage(postedImage);
  
  // Show comment section
  window.showCommentSection();
  
  // Reset upload interface
  resetUploadInterface();
  
  // Show success notification
  showSuccessNotification('✅ Alt text added successfully!');
  
  console.log('🎉 Image posted successfully!');
}

/**
 * Displays a posted image in the feed
 * @param {Object} imageData - The posted image data
 */
window.displayPostedImage = function displayPostedImage(imageData) {
  const postedImages = getElement('postedImages');
  const imagesFeed = getElement('imagesFeed');
  
  if (!postedImages || !imagesFeed) {
    console.error('Posted images elements not found');
    return;
  }
  
  // Show the posted images section
  postedImages.style.display = 'block';
  
  // Create image item
  const imageItem = document.createElement('div');
  imageItem.className = 'posted-image-item';
  imageItem.dataset.imageId = imageData.id;
  
  const timestamp = new Date(imageData.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  imageItem.innerHTML = `
    <img src="${imageData.imageData}" alt="${escapeHtml(imageData.altText)}">
    <div class="posted-image-meta">
      <span>Posted ${timestamp}</span>
    </div>
  `;
  
  // Add to feed (newest first)
  imagesFeed.insertBefore(imageItem, imagesFeed.firstChild);
}

/**
 * Shows the comment section after an image is posted
 */
window.showCommentSection = function showCommentSection() {
  const commentSection = getElement('commentSection');
  if (commentSection) {
    commentSection.style.display = 'block';
    console.log('💬 Comment section shown');
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
  uploadSection.style.display = 'none';
  console.log('📦 Upload section hidden after posting');
  
  // Make sure upload area is visible when section is shown again
  uploadArea.style.display = 'block';
  
  if (preview) preview.style.display = 'none';
  if (actionsEl) actionsEl.style.display = 'none';
  if (fileInput) fileInput.value = '';
  
  currentImageData = null;
  currentAltText = null;
  
  console.log('🔄 Upload interface reset and hidden');
}

// Make functions globally available for cross-module compatibility
window.handleFileSelect = handleFileSelect;
window.handleFile = handleFile;
window.generateAltText = generateAltText;
window.cancelImageSelection = cancelImageSelection;
window.acceptAndPostImage = acceptAndPostImage;

// Make current image data available globally (as a getter since it can change)
Object.defineProperty(window, 'currentImageData', {
  get: () => currentImageData
});

console.log('📤 Image upload module functions made globally available');

