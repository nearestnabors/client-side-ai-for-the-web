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
  
  if (!preview || !img) {
    console.error('Image preview elements not found');
    return;
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
  
  // Show loading state with cancel button
  const altTextResult = document.getElementById('altTextResult');
  const regenerateBtn = document.getElementById('regenerateAltText');
  
  if (!altTextResult) {
    console.error('Alt text result element not found');
    return;
  }
  
  altTextResult.innerHTML = `
    <div>
      🤖 Analyzing image with Gemini AI... <span class="loading"></span>
      <button id="cancelAnalysis" class="cancel-btn">Cancel</button>
    </div>
  `;
  
  if (regenerateBtn) {
    regenerateBtn.style.display = 'none';
  }
  
  // Add cancel button functionality
  setTimeout(() => {
    const cancelBtn = document.getElementById('cancelAnalysis');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelAnalysis);
    }
  }, 0);
  
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
 * Cancels the current image analysis request
 */
function cancelAnalysis() {
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }
}

/**
 * Updates the alt text result display
 * @param {string} text - The alt text or error message to display
 */
function updateAltTextResult(text) {
  const resultEl = document.getElementById('altTextResult');
  const regenerateBtn = document.getElementById('regenerateAltText');
  
  if (!resultEl) {
    console.error('Alt text result element not found');
    return;
  }
  
  if (text.startsWith('❌') || text.startsWith('⏹️')) {
    resultEl.innerHTML = `<div style="color: #c62828;">${text}</div>`;
    if (regenerateBtn) {
      regenerateBtn.style.display = 'none';
    }
  } else {
    resultEl.innerHTML = `<div class="alt-text">${escapeHtml(text)}</div>`;
    if (regenerateBtn) {
      regenerateBtn.style.display = 'inline-block';
    }
  }
}