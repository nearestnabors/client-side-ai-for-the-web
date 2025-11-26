/**
 * Image Upload and Analysis
 * Handles file uploads, drag-and-drop, and AI-powered alt-text generation
 */

let currentImageData = null;
let currentAltText = null;
let currentAnalysisController = null;

/**
 * Handles file selection from the file input
 * @param {Event} e - File input change event
 */
function handleFileSelect(e) {
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
function handleFile(file) {
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
  
  const preview = document.getElementById('imagePreview');
  const img = document.getElementById('previewImg');
  const uploadArea = document.getElementById('uploadArea');
  
  if (!preview || !img) {
    console.error('Image preview elements not found');
    return;
  }
  
  // Hide the upload area once image is selected
  if (uploadArea) {
    uploadArea.style.display = 'none';
    console.log('📦 Upload area hidden - image selected for processing');
  }
  
  img.src = dataUrl;
  img.alt = fileName;
  preview.style.display = 'block';
}

/**
 * Sends the image to Google's Gemini AI for alt-text generation
 * Uses the configured API key to make the request
 * @param {string} imageData - Base64 data URL of the image
 */
async function generateAltText(imageData) {
  if (!geminiApiKey) {
    updateAltTextResult('❌ Please configure your Google AI API key first');
    return;
  }
  
  // Cancel any existing analysis
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }
  
  // Create new abort controller for cancellation
  currentAnalysisController = new AbortController();
  
  // Show loading state
  const altTextResult = document.getElementById('altTextResult');
  const regenerateBtn = document.getElementById('regenerateAltText');
  
  if (!altTextResult) {
    console.error('Alt text result element not found');
    return;
  }
  
  altTextResult.innerHTML = `
    <div>
      🤖 Analyzing image with Gemini AI... <span class="loading"></span>
    </div>
  `;
  altTextResult.style.display = 'block';
  
  if (regenerateBtn) {
    regenerateBtn.style.display = 'none';
  }
  
  try {
    // Extract image data and detect MIME type
    const [mimeInfo, base64Data] = imageData.split(',');
    const mimeType = mimeInfo.match(/data:([^;]+)/)[1];
    
    console.log('Sending request to Gemini API...');
    
    // Make API request to Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: currentAnalysisController.signal,
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Generate a concise alt text description for this image, focusing on the main subject, key visual elements, and setting."
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.4
        }
      })
    });
    
    console.log('Response status:', response.status);
    
    // Handle API errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      let errorMsg;
      try {
        const error = JSON.parse(errorText);
        errorMsg = error.error?.message || `API Error: ${response.status}`;
      } catch {
        errorMsg = `API Error: ${response.status} - ${errorText}`;
      }
      throw new Error(errorMsg);
    }
    
    // Parse the response
    const data = await response.json();
    console.log('API Response:', data);
    
    // Extract alt text from various possible response structures
    let altText = null;
    const candidate = data.candidates?.[0];
    
    if (candidate) {
      console.log('Full candidate object:', JSON.stringify(candidate, null, 2));
      
      // Check if response was truncated
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('Response was truncated due to MAX_TOKENS - attempting to extract partial text');
      }
      
      // Try multiple possible response structures
      if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
        // Look through all parts for text
        for (const part of candidate.content.parts) {
          if (part.text) {
            altText = part.text.trim();
            break;
          }
        }
      }
      
      // Fallback to other possible structures
      if (!altText) {
        if (candidate.content?.text) {
          altText = candidate.content.text.trim();
        } else if (candidate.text) {
          altText = candidate.text.trim();
        } else if (candidate.output) {
          altText = candidate.output.trim();
        }
      }
    }
    
    console.log('Extracted alt text:', altText);
    
    if (altText) {
      currentAltText = altText;
      // If truncated, append a note
      if (candidate?.finishReason === 'MAX_TOKENS') {
        updateAltTextResult(altText + ' (response truncated)');
      } else {
        updateAltTextResult(altText);
      }
    } else {
      console.error('No alt text found in response:', data);
      console.error('Response structure:', JSON.stringify(data, null, 2));
      
      // Provide more helpful error message
      if (candidate?.finishReason === 'MAX_TOKENS') {
        throw new Error('Response was truncated and no text was generated. Try with a smaller image or increase maxOutputTokens.');
      } else if (candidate?.finishReason) {
        throw new Error(`API response finished with reason: ${candidate.finishReason}`);
      } else {
        throw new Error('No alt text generated - unexpected response structure');
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      updateAltTextResult('⏹️ Analysis cancelled');
    } else {
      console.error('Alt text generation error:', error);
      updateAltTextResult(`❌ Error generating alt text: ${error.message}`);
    }
  } finally {
    currentAnalysisController = null;
  }
}


/**
 * Cancels the current image selection and returns to upload area
 */
window.cancelImageSelection = function cancelImageSelection() {
  console.log('❌ User cancelled image selection');
  
  // Cancel any ongoing analysis
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }
  
  // Hide preview and reset all elements
  const preview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const actionsEl = document.getElementById('altTextActions');
  const altTextResult = document.getElementById('altTextResult');
  
  if (preview) {
    preview.style.display = 'none';
    console.log('🔄 Image preview hidden');
  }
  
  // Clear the preview image
  if (previewImg) {
    previewImg.src = '';
    previewImg.alt = '';
    console.log('🔄 Preview image cleared');
  }
  
  if (actionsEl) {
    actionsEl.style.display = 'none';
    console.log('🔄 Alt text actions hidden');
  }
  
  // Reset alt text result area
  if (altTextResult) {
    altTextResult.innerHTML = '<div class="loading">Analyzing image with Gemini AI...</div>';
    altTextResult.style.display = 'block';
    console.log('🔄 Alt text result area reset');
  }
  
  // Clear alt text editor if it exists
  const altTextEditor = document.getElementById('altTextEditor');
  if (altTextEditor) {
    altTextEditor.value = '';
    console.log('🔄 Alt text editor cleared');
  }
  
  // Show upload area again
  const uploadArea = document.getElementById('uploadArea');
  if (uploadArea) {
    uploadArea.style.display = 'block';
    console.log('📦 Upload area shown - user cancelled image selection');
  } else {
    console.error('❌ Upload area element not found!');
  }
  
  // Reset file input and current data
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.value = '';
    console.log('🔄 File input cleared');
  }
  
  currentImageData = null;
  currentAltText = null;
  console.log('✅ Image selection cancelled and upload area restored');
}

/**
 * Updates the alt text result display and shows editing interface
 * @param {string} text - The alt text or error message to display
 */
function updateAltTextResult(text) {
  const resultEl = document.getElementById('altTextResult');
  const actionsEl = document.getElementById('altTextActions');
  const editorEl = document.getElementById('altTextEditor');
  
  if (!resultEl || !actionsEl || !editorEl) {
    console.error('Alt text elements not found');
    return;
  }
  
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
    
    console.log('✅ Alt text generated and editing interface shown');
  }
}

/**
 * Handles accepting and posting the image with alt text
 */
function acceptAndPostImage() {
  const editorEl = document.getElementById('altTextEditor');
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
  displayPostedImage(postedImage);
  
  // Show comment section
  showCommentSection();
  
  // Reset upload interface
  resetUploadInterface();
  
  console.log('🎉 Image posted successfully!');
}

/**
 * Displays a posted image in the feed
 * @param {Object} imageData - The posted image data
 */
window.displayPostedImage = function displayPostedImage(imageData) {
  const postedImages = document.getElementById('postedImages');
  const imagesFeed = document.getElementById('imagesFeed');
  
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
  const commentSection = document.getElementById('commentSection');
  if (commentSection) {
    commentSection.style.display = 'block';
    console.log('💬 Comment section shown');
  }
}

/**
 * Resets and hides the upload interface after posting
 */
function resetUploadInterface() {
  const uploadSection = document.getElementById('uploadSection');
  const uploadArea = document.getElementById('uploadArea');
  const preview = document.getElementById('imagePreview');
  const actionsEl = document.getElementById('altTextActions');
  const fileInput = document.getElementById('fileInput');
  
  // Hide the entire upload section after successful posting
  if (uploadSection) {
    uploadSection.style.display = 'none';
    console.log('📦 Upload section hidden after posting');
  }
  
  // Make sure upload area is visible when section is shown again
  if (uploadArea) {
    uploadArea.style.display = 'block';
  }
  
  if (preview) preview.style.display = 'none';
  if (actionsEl) actionsEl.style.display = 'none';
  if (fileInput) fileInput.value = '';
  
  currentImageData = null;
  currentAltText = null;
  
  console.log('🔄 Upload interface reset and hidden');
}

