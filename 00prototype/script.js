let session = null;
let isApiAvailable = false;

// Check API availability on load
async function checkApiAvailability() {
  const statusEl = document.getElementById('apiStatus');
  
  try {
    // Log environment info for debugging
    const isSecureContext = window.isSecureContext;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    console.log('Environment check:', { isSecureContext, protocol, hostname, userAgent: navigator.userAgent });
    
    // Check multiple possible locations for the API
    const LanguageModel = window.LanguageModel || navigator.languageModel || globalThis.LanguageModel;
    
    if (!LanguageModel) {
      const userAgent = navigator.userAgent;
      const chromeVersion = userAgent.match(/Chrome\/(\d+)/)?.[1];
      
      // Check if we're in a secure context
      if (!isSecureContext && protocol !== 'http:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        statusEl.textContent = '❌ Chrome Prompt API requires HTTPS or localhost. Please serve this page via HTTPS or open from localhost.';
        statusEl.className = 'api-status unavailable';
        return false;
      }
      
      // Check all window properties for debugging
      const relevantKeys = Object.keys(window).filter(k => 
        k.toLowerCase().includes('language') || 
        k.toLowerCase().includes('model') ||
        k.toLowerCase().includes('ai') ||
        k.toLowerCase().includes('gemini')
      );
      console.error('LanguageModel API not found. Relevant globals found:', relevantKeys);
      console.error('All window properties (first 50):', Object.keys(window).slice(0, 50));
      
      // Check if origin trial meta tag is present
      const originTrialMeta = document.querySelector('meta[http-equiv="origin-trial"]');
      const hasOriginTrial = originTrialMeta && originTrialMeta.content && !originTrialMeta.content.includes('YOUR_ORIGIN_TRIAL_TOKEN');
      
      let errorMsg = '';
      if (!hasOriginTrial) {
        errorMsg = `❌ Chrome Prompt API requires an origin trial token.\n\nGet your token at: https://developer.chrome.com/origintrials/#/view_trial/2533837740349325313\n\nThen replace YOUR_ORIGIN_TRIAL_TOKEN_HERE in the <meta> tag in this HTML file.`;
      } else if (chromeVersion) {
        errorMsg = `❌ Chrome Prompt API not found (Chrome ${chromeVersion} detected).\n\nPossible causes:\n- Browser extensions may be interfering (try disabling them)\n- API may need to be enabled in chrome://flags\n- Issue with origin trial token\n- Hardware requirements not met`;
      } else {
        errorMsg = '❌ Chrome Prompt API not found. Please ensure you\'re using Chrome 138+ with experimental features enabled.';
      }
      
      statusEl.textContent = errorMsg;
      statusEl.className = 'api-status unavailable';
      return false;
    }

    // Check if availability method exists
    if (typeof LanguageModel.availability !== 'function') {
      statusEl.textContent = '⚠️ LanguageModel found but availability() method missing. API may be partially available.';
      statusEl.className = 'api-status unavailable';
      return false;
    }

    const availability = await LanguageModel.availability();
    console.log('LanguageModel availability:', availability);
    
    if (availability === 'unavailable') {
      statusEl.textContent = '❌ Gemini Nano model is not available. Please check your hardware requirements (22GB storage, 4GB+ VRAM or 16GB+ RAM with 4+ cores). Visit chrome://on-device-internals to check model status.';
      statusEl.className = 'api-status unavailable';
      return false;
    }

    // Store reference to LanguageModel for later use
    window.LanguageModel = LanguageModel;

    const statusMsg = availability === 'readily' 
      ? '✅ Chrome Prompt API is available and ready to use.'
      : '⏳ Chrome Prompt API is available. Model may download on first use.';
    
    statusEl.textContent = statusMsg;
    statusEl.className = 'api-status available';
    return true;
  } catch (error) {
    statusEl.textContent = `❌ Error checking API: ${error.message}. Check console for details.`;
    statusEl.className = 'api-status unavailable';
    console.error('API availability check error:', error);
    return false;
  }
}

// Initialize session
async function initializeSession() {
  if (!isApiAvailable) return;

  try {
    // Session will be created on first user interaction
    // We'll create it when the user tries to submit
    console.log('Session will be created on first user interaction');
  } catch (error) {
    console.error('Error initializing session:', error);
    showStatus('error', 'Failed to initialize AI session. Please refresh the page.');
  }
}

// Analyze comment using Prompt API
async function analyzeComment(comment) {
  if (!session) {
    // Create session on first use (requires user activation)
    const LanguageModel = window.LanguageModel || navigator.languageModel || globalThis.LanguageModel;
    if (!LanguageModel) {
      throw new Error('LanguageModel API not available');
    }
    session = await LanguageModel.create();
  }

  const schema = {
    type: "object",
    properties: {
      isProblematic: {
        type: "boolean",
        description: "True if the comment is mean-spirited, hostile, or not arguing in good faith"
      },
      reason: {
        type: "string",
        description: "Brief explanation of why the comment is problematic (if it is)"
      },
      suggestion: {
        type: "string",
        description: "A constructive, objective alternative way to convey the same information or intent"
      }
    },
    required: ["isProblematic", "reason", "suggestion"]
  };

  const prompt = `Analyze this comment about a photo and determine if it is mean-spirited, hostile, or not arguing in good faith. Consider:
- Use of personal attacks or insults
- Hostile or aggressive tone
- Dishonest or misleading arguments
- Intent to provoke rather than engage constructively
- Lack of respect for the other party

Flirtatious comments are ok, so long as they are not mean-spirited or hostile or imply that the other person owes the commenter something.

Comment to analyze: "${comment}"

If the comment is problematic, provide a constructive alternative that maintains the core message but presents it objectively and respectfully. Keep in mind, these are comments about appearance on photos, not about philosphical disagreements.`;

  const result = await session.prompt(prompt, {
    responseConstraint: schema
  });

  return JSON.parse(result);
}

// Show status message
function showStatus(type, message, suggestion = null) {
  const statusEl = document.getElementById('status');
  statusEl.className = `status show ${type}`;
  statusEl.innerHTML = message;

  if (suggestion) {
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'suggestion';
    suggestionDiv.innerHTML = `
      <h3>💡 Try this instead</h3>
      <p>${suggestion}</p>
    `;
    statusEl.appendChild(suggestionDiv);
  }
}

// Save comments to localStorage
function saveComments() {
  const comments = [];
  const commentItems = document.querySelectorAll('.comment-item');
  commentItems.forEach(item => {
    const text = item.querySelector('.comment-text').textContent;
    const date = item.querySelector('.comment-date').textContent;
    comments.push({ text, date });
  });
  localStorage.setItem('halloweenComments', JSON.stringify(comments));
}

// Load comments from localStorage
function loadComments() {
  const saved = localStorage.getItem('halloweenComments');
  if (!saved) return;
  
  try {
    const comments = JSON.parse(saved);
    const commentsSection = document.getElementById('commentsSection');
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length > 0) {
      commentsSection.style.display = 'block';
      const commentsHeader = document.getElementById('commentsHeader');
      if (commentsHeader) {
        commentsHeader.style.display = 'block';
      }
      
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
      
      // Show clear all button if there are comments
      const clearAllBtn = document.getElementById('clearAllBtn');
      if (clearAllBtn) {
        clearAllBtn.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

// Add comment to the display
function addComment(commentText) {
  const commentsSection = document.getElementById('commentsSection');
  const commentsList = document.getElementById('commentsList');
  const commentsHeader = document.getElementById('commentsHeader');
  
  // Show comments section and header if hidden
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
  
  // Show clear all button
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.style.display = 'block';
  }
  
  // Scroll to the new comment
  commentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle form submission
document.getElementById('commentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const comment = document.getElementById('comment').value.trim();
  if (!comment) return;

  const submitBtn = document.getElementById('submitBtn');
  const statusEl = document.getElementById('status');

  // Disable submit button and show checking status
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Checking... <span class="loading"></span>';
  showStatus('checking', '🔍 Analyzing your comment for tone and good-faith argumentation...');

  try {
    const analysis = await analyzeComment(comment);

    if (analysis.isProblematic) {
      // Block submission and show suggestion
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submit Comment';
      showStatus(
        'blocked', 
        `<h3>⚠️ Reconsider</h3> <p>${analysis.reason}</p>`,
        analysis.suggestion
      );
    } else {
      // Allow submission
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Comment';
      showStatus('allowed', '✅ Your comment looks constructive and respectful. Ready to submit!');
      
      // Add comment to the display
      addComment(comment);
      
      // Clear the form
      document.getElementById('comment').value = '';
      document.getElementById('status').className = 'status';
      submitBtn.disabled = !isApiAvailable;
    }
  } catch (error) {
    console.error('Error analyzing comment:', error);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Comment';
    showStatus('error', `❌ Error analyzing comment: ${error.message}. Please try again.`);
  }
});

// Enable/disable submit button based on API availability and input
document.getElementById('comment').addEventListener('input', (e) => {
  const hasText = e.target.value.trim().length > 0;
  document.getElementById('submitBtn').disabled = !isApiAvailable || !hasText;
});

// Handle clear all button
const clearAllBtn = document.getElementById('clearAllBtn');
if (clearAllBtn) {
  clearAllBtn.addEventListener('click', () => {
    const commentsList = document.getElementById('commentsList');
    const commentsSection = document.getElementById('commentsSection');
    const commentsHeader = document.getElementById('commentsHeader');
    
    commentsList.innerHTML = '';
    commentsSection.style.display = 'none';
    if (commentsHeader) {
      commentsHeader.style.display = 'none';
    }
    clearAllBtn.style.display = 'none';
    localStorage.removeItem('halloweenComments');
  });
}

// Initialize on load
window.addEventListener('load', async () => {
  isApiAvailable = await checkApiAvailability();
  document.getElementById('submitBtn').disabled = !isApiAvailable;
  
  // Load saved comments
  loadComments();
  
  if (isApiAvailable) {
    // Don't initialize session yet - wait for user interaction
    console.log('Ready to analyze comments');
    
    // Remove API status message after 3 seconds
    setTimeout(() => {
      const apiStatusEl = document.getElementById('apiStatus');
      if (apiStatusEl) {
        apiStatusEl.style.transition = 'opacity 0.5s ease-out';
        apiStatusEl.style.opacity = '0';
        setTimeout(() => {
          apiStatusEl.remove();
        }, 500);
      }
    }, 3000);
  }
});
