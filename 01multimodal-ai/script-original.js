// Global state
let geminiApiKey = null;
let currentImageData = null;
let currentAltText = null;
let currentAnalysisController = null;

// Load saved API key and images on startup
window.addEventListener('load', () => {
  loadApiKey();
  // Clear any stored images to prevent quota issues
  localStorage.removeItem('uploadedImages');
  loadComments();
  setupEventListeners();
  updateUIState();
});

// API Key Management
function loadApiKey() {
  const saved = localStorage.getItem('geminiApiKey');
  if (saved) {
    geminiApiKey = saved;
    document.getElementById('apiKeyInput').value = '••••••••••••••••••••••••••••••••••••••••';
    updateApiStatus('✅ Google AI API key configured. Ready to analyze images and comments!', 'available');
  } else {
    updateApiStatus('🔑 Enter your Google AI API key to get started', 'unavailable');
  }
}

function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  const key = input.value.trim();
  
  if (!key || key === '••••••••••••••••••••••••••••••••••••••••') {
    alert('Please enter a valid API key');
    return;
  }
  
  // Basic validation - Google AI keys start with 'AIza'
  if (!key.startsWith('AIza')) {
    alert('Invalid API key format. Google AI keys should start with "AIza"');
    return;
  }
  
  localStorage.setItem('geminiApiKey', key);
  geminiApiKey = key;
  input.value = '••••••••••••••••••••••••••••••••••••••••';
  updateApiStatus('✅ API key saved! Ready to analyze images and comments.', 'available');
  updateUIState();
}

function updateApiStatus(message, type) {
  const statusEl = document.getElementById('apiStatus');
  statusEl.textContent = message;
  statusEl.className = `api-status ${type}`;
}

// Image Upload and Processing
function setupEventListeners() {
  // API key saving
  document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveApiKey();
  });
  
  // File upload
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  
  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and drop
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
  
  // Alt text regeneration and cancel
  document.getElementById('regenerateAltText').addEventListener('click', () => {
    if (currentImageData) {
      generateAltText(currentImageData);
    }
  });
  
  document.getElementById('cancelAnalysis')?.addEventListener('click', cancelAnalysis);
  
  // Comment form
  document.getElementById('commentForm').addEventListener('submit', handleCommentSubmit);
  document.getElementById('comment').addEventListener('input', updateSubmitButton);
  
  // Clear all comments
  document.getElementById('clearAllBtn')?.addEventListener('click', clearAllComments);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    alert('Image file is too large. Please select a file under 10MB.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    displayImagePreview(e.target.result, file.name);
    generateAltText(e.target.result);
  };
  reader.readAsDataURL(file);
}

function displayImagePreview(dataUrl, fileName) {
  currentImageData = dataUrl;
  
  const preview = document.getElementById('imagePreview');
  const img = document.getElementById('previewImg');
  
  img.src = dataUrl;
  img.alt = fileName;
  preview.style.display = 'block';
  
  // Don't save images to localStorage - they're too large and cause quota issues
  // Images will only persist for the current session
}

async function generateAltText(imageData) {
  if (!geminiApiKey) {
    updateAltTextResult('❌ Please configure your Google AI API key first');
    return;
  }
  
  // Cancel any existing analysis
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }
  
  // Create new abort controller for this request
  currentAnalysisController = new AbortController();
  
  // Show loading state with cancel button
  document.getElementById('altTextResult').innerHTML = `
    <div>
      🤖 Analyzing image with Gemini AI... <span class="loading"></span>
      <button id="cancelAnalysis" class="cancel-btn">Cancel</button>
    </div>
  `;
  document.getElementById('regenerateAltText').style.display = 'none';
  
  // Add event listener to the dynamically created cancel button
  setTimeout(() => {
    const cancelBtn = document.getElementById('cancelAnalysis');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelAnalysis);
    }
  }, 0);
  
  try {
    // Convert data URL to base64 and detect mime type
    const [mimeInfo, base64Data] = imageData.split(',');
    const mimeType = mimeInfo.match(/data:([^;]+)/)[1];
    
    console.log('Sending request to Gemini API...');
    
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
          maxOutputTokens: 1000,
          temperature: 0.4
        }
      })
    });
    
    console.log('Response status:', response.status);
    
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
    
    const data = await response.json();
    console.log('API Response:', data);
    console.log('Candidates:', data.candidates);
    console.log('First candidate:', data.candidates?.[0]);
    console.log('Content:', data.candidates?.[0]?.content);
    console.log('Parts:', data.candidates?.[0]?.content?.parts);
    
    // Check if we hit token limit
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      console.warn('Response was truncated due to MAX_TOKENS');
    }
    
    // Try different possible response structures
    let altText = null;
    
    // More thorough checking of response structure
    const candidate = data.candidates?.[0];
    if (candidate) {
      console.log('Full candidate object:', JSON.stringify(candidate, null, 2));
      
      // Check for text in parts array
      if (candidate.content?.parts?.[0]?.text) {
        altText = candidate.content.parts[0].text.trim();
      }
      // Check for direct text property in content
      else if (candidate.content?.text) {
        altText = candidate.content.text.trim();
      }
      // Check for text directly in candidate
      else if (candidate.text) {
        altText = candidate.text.trim();
      }
      // Check for output property
      else if (candidate.output) {
        altText = candidate.output.trim();
      }
    }
    
    console.log('Extracted alt text:', altText);
    
    if (altText) {
      currentAltText = altText;
      updateAltTextResult(altText);
      
      // Don't save to localStorage due to quota issues with large images
    } else {
      console.error('No alt text found in response:', data);
      console.error('Response structure:', JSON.stringify(data, null, 2));
      throw new Error('No alt text generated');
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

function cancelAnalysis() {
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }
}

function updateAltTextResult(text) {
  const resultEl = document.getElementById('altTextResult');
  const regenerateBtn = document.getElementById('regenerateAltText');
  
  if (text.startsWith('❌') || text.startsWith('⏹️')) {
    resultEl.innerHTML = `<div style="color: #c62828;">${text}</div>`;
    regenerateBtn.style.display = 'none';
  } else {
    resultEl.innerHTML = `<div class="alt-text">${escapeHtml(text)}</div>`;
    regenerateBtn.style.display = 'inline-block';
  }
}

// Comment Analysis
async function handleCommentSubmit(e) {
  e.preventDefault();
  
  const comment = document.getElementById('comment').value.trim();
  if (!comment) return;
  
  if (!geminiApiKey) {
    showStatus('error', '❌ Please configure your Google AI API key first');
    return;
  }
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Checking... <span class="loading"></span>';
  
  showStatus('checking', '🔍 Analyzing your comment for tone and constructiveness...');
  
  try {
    const analysis = await analyzeComment(comment);
    
    if (analysis.isProblematic) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submit Comment';
      showStatus(
        'blocked',
        `<h3>⚠️ Consider Revising</h3><p>${analysis.reason}</p>`,
        analysis.suggestion
      );
    } else {
      // Add comment to display
      addComment(comment);
      
      // Clear form and show success
      document.getElementById('comment').value = '';
      showStatus('allowed', '✅ Comment posted! It looks constructive and respectful.');
      
      // Reset button
      submitBtn.innerHTML = 'Submit Comment';
      updateSubmitButton();
      
      // Clear status after a moment
      setTimeout(() => {
        document.getElementById('status').className = 'status';
      }, 3000);
    }
  } catch (error) {
    console.error('Comment analysis error:', error);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Comment';
    showStatus('error', `❌ Error analyzing comment: ${error.message}`);
  }
}

async function analyzeComment(comment) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Analyze this comment and determine if it contains problematic content. Return your response as a JSON object with these exact fields:

{
  "isProblematic": boolean,
  "reason": "Brief explanation if problematic",
  "suggestion": "A constructive alternative if problematic"
}

Consider these factors when analyzing:
- Personal attacks or insults
- Hostile or aggressive tone
- Inappropriate sexual content
- Discriminatory language
- Intent to provoke rather than engage constructively
- Lack of respect for others

Constructive criticism, genuine questions, and polite disagreements are acceptable.

Comment to analyze: "${comment.replace(/"/g, '\\"')}"`
        }]
      }],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.3
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }
  
  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!responseText) {
    throw new Error('No response from API');
  }
  
  // Extract JSON from response
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Invalid response format');
    }
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Response:', responseText);
    throw new Error('Invalid response format from AI');
  }
}

// UI Helper Functions
function updateSubmitButton() {
  const comment = document.getElementById('comment').value.trim();
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = !geminiApiKey || !comment;
}

function updateUIState() {
  updateSubmitButton();
  
  // Show/hide API key section
  const apiKeySection = document.getElementById('apiKeySection');
  if (geminiApiKey) {
    apiKeySection.style.display = 'none';
  } else {
    apiKeySection.style.display = 'block';
  }
}

function showStatus(type, message, suggestion = null) {
  const statusEl = document.getElementById('status');
  statusEl.className = `status show ${type}`;
  statusEl.innerHTML = message;
  
  if (suggestion) {
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'suggestion';
    suggestionDiv.innerHTML = `
      <h3>💡 Try this instead</h3>
      <p>${escapeHtml(suggestion)}</p>
    `;
    statusEl.appendChild(suggestionDiv);
  }
}

// Local Storage Functions (Images removed due to quota issues)

function addComment(commentText) {
  const commentsSection = document.getElementById('commentsSection');
  const commentsList = document.getElementById('commentsList');
  const commentsHeader = document.getElementById('commentsHeader');
  
  // Show comments section
  commentsSection.style.display = 'block';
  if (commentsHeader) {
    commentsHeader.style.display = 'block';
  }
  
  // Create comment element
  const commentItem = document.createElement('div');
  commentItem.className = 'comment-item';
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  commentItem.innerHTML = `
    <div class="comment-text">${escapeHtml(commentText)}</div>
    <div class="comment-meta">
      <span class="comment-date">${dateStr}</span>
    </div>
  `;
  
  commentsList.appendChild(commentItem);
  
  // Save to localStorage
  saveComments();
  
  // Show clear button
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.style.display = 'block';
  }
  
  // Scroll to new comment
  commentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveComments() {
  const comments = [];
  const commentItems = document.querySelectorAll('.comment-item');
  commentItems.forEach(item => {
    const text = item.querySelector('.comment-text').textContent;
    const date = item.querySelector('.comment-date').textContent;
    comments.push({ text, date });
  });
  localStorage.setItem('comments', JSON.stringify(comments));
}

function loadComments() {
  const saved = localStorage.getItem('comments');
  if (!saved) return;
  
  try {
    const comments = JSON.parse(saved);
    const commentsSection = document.getElementById('commentsSection');
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length > 0) {
      commentsSection.style.display = 'block';
      
      comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        
        commentItem.innerHTML = `
          <div class="comment-text">${escapeHtml(comment.text)}</div>
          <div class="comment-meta">
            <span class="comment-date">${escapeHtml(comment.date)}</span>
          </div>
        `;
        
        commentsList.appendChild(commentItem);
      });
      
      // Show clear button
      const clearAllBtn = document.getElementById('clearAllBtn');
      if (clearAllBtn) {
        clearAllBtn.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

function clearAllComments() {
  const commentsList = document.getElementById('commentsList');
  const commentsSection = document.getElementById('commentsSection');
  const clearAllBtn = document.getElementById('clearAllBtn');
  
  commentsList.innerHTML = '';
  commentsSection.style.display = 'none';
  clearAllBtn.style.display = 'none';
  
  localStorage.removeItem('comments');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}