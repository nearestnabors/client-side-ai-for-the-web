/**
 * Comment Moderation
 * Uses AI to evaluate comments for toxicity and suggest improvements
 */

/**
 * Handles comment form submission
 * Validates the comment with AI before posting
 * @param {Event} e - Form submission event
 */
async function handleCommentSubmit(e) {
  e.preventDefault();
  
  const commentEl = document.getElementById('comment');
  if (!commentEl) {
    console.error('Comment input element not found');
    return;
  }
  
  const comment = commentEl.value.trim();
  if (!comment) return;
  
  if (!geminiApiKey) {
    showStatus('error', '❌ Please configure your Google AI API key first');
    return;
  }
  
  const submitBtn = document.getElementById('submitBtn');
  if (!submitBtn) {
    console.error('Submit button element not found');
    return;
  }
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Checking... <span class="loading"></span>';
  
  showStatus('checking', '🔍 Analyzing your comment for tone and constructiveness...');
  
  try {
    const analysis = await analyzeComment(comment);
    
    if (analysis.isProblematic) {
      // Block problematic comments and show suggestions
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submit Comment';
      showStatus(
        'blocked',
        `<h3>⚠️ Consider Revising</h3><p>${analysis.reason}</p>`,
        analysis.suggestion
      );
    } else {
      // Accept good comments and post them
      addComment(comment);
      
      // Clear form and show success
      const commentInput = document.getElementById('comment');
      if (commentInput) {
        commentInput.value = '';
      }
      showStatus('allowed', '✅ Comment posted! It looks constructive and respectful.');
      
      // Reset button state
      submitBtn.innerHTML = 'Submit Comment';
      updateSubmitButton();
      
      // Clear status message after a moment
      setTimeout(() => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
          statusEl.className = 'status';
        }
      }, 3000);
    }
  } catch (error) {
    console.error('Comment analysis error:', error);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Comment';
    showStatus('error', `❌ Error analyzing comment: ${error.message}`);
  }
}

/**
 * Sends a comment to AI for toxicity and tone analysis
 * @param {string} comment - The comment text to analyze
 * @returns {Object} Analysis result with isProblematic, reason, and suggestion
 */
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
        maxOutputTokens: 1000,
        temperature: 0.3
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }
  
  const data = await response.json();
  
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
      }
    }
    
    // Log if response was truncated
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('Comment analysis response was truncated due to MAX_TOKENS');
    }
  }
  
  if (!responseText) {
    console.error('No response text found in API response:', data);
    
    // Provide helpful error message based on finish reason
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new Error('API response was truncated due to token limit. The comment may be too complex to analyze. Please try a shorter comment.');
    } else if (candidate?.finishReason) {
      throw new Error(`API response finished with reason: ${candidate.finishReason}. Unable to analyze comment.`);
    } else {
      throw new Error('No response text found in API response. The API may be experiencing issues.');
    }
  }
  
  // Extract JSON from the response
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      console.error('No JSON found in response text:', responseText);
      throw new Error('Invalid response format - no JSON object found');
    }
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Response:', responseText);
    throw new Error(`Invalid response format from AI: ${parseError.message}`);
  }
}

/**
 * Shows status messages to the user with enhanced suggestion interface
 * @param {string} type - Status type: 'checking', 'blocked', 'allowed', 'error'
 * @param {string} message - Main message to display
 * @param {string} suggestion - Optional suggestion text for alternatives
 */
function showStatus(type, message, suggestion = null) {
  const statusEl = document.getElementById('status');
  if (!statusEl) {
    console.error('Status element not found');
    return;
  }
  statusEl.className = `status show ${type}`;
  statusEl.innerHTML = message;
  
  if (suggestion && type === 'blocked') {
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'suggestion-interface';
    suggestionDiv.innerHTML = `
      <div class="suggestion-header">
        <h3>💡 Here's a friendlier way to say it:</h3>
      </div>
      <div class="suggestion-content">
        <textarea class="suggestion-editor" id="suggestionEditor">${escapeHtml(suggestion)}</textarea>
        <div class="suggestion-actions">
          <button class="suggestion-btn regenerate-btn" onclick="regenerateSuggestion()">🔄 Regenerate</button>
          <button class="suggestion-btn submit-btn" onclick="submitSuggestion()">✅ Submit</button>
        </div>
      </div>
    `;
    statusEl.appendChild(suggestionDiv);
  }
}

/**
 * Regenerates a new suggestion for the blocked comment
 */
window.regenerateSuggestion = function regenerateSuggestion() {
  console.log('🔄 Regenerating comment suggestion');
  
  const commentInput = document.getElementById('comment');
  if (!commentInput) {
    console.error('Comment input not found');
    return;
  }
  
  const originalComment = commentInput.value.trim();
  if (!originalComment) {
    console.error('No original comment to regenerate suggestion for');
    return;
  }
  
  // Show regenerating status
  showStatus('checking', '🔄 Generating a new suggestion...');
  
  // Re-analyze the original comment to get a new suggestion
  analyzeComment(originalComment)
    .then(analysis => {
      if (analysis.isProblematic && analysis.suggestion) {
        showStatus('blocked', analysis.reason, analysis.suggestion);
      } else {
        // If it's no longer problematic, allow submission
        clearStatus();
        showStatus('allowed', '✅ Comment looks good now! You can submit it.');
        setTimeout(clearStatus, 3000);
      }
    })
    .catch(error => {
      console.error('Error regenerating suggestion:', error);
      showStatus('error', `❌ Error generating new suggestion: ${error.message}`);
    });
}

/**
 * Submits the suggested comment text
 */
window.submitSuggestion = function submitSuggestion() {
  const suggestionEditor = document.getElementById('suggestionEditor');
  const commentInput = document.getElementById('comment');
  
  if (!suggestionEditor || !commentInput) {
    console.error('Required elements not found for suggestion submission');
    return;
  }
  
  const suggestedText = suggestionEditor.value.trim();
  if (!suggestedText) {
    console.error('No suggested text to submit');
    return;
  }
  
  console.log('✅ Submitting AI-suggested comment');
  
  // Use the suggested text and post the comment
  addComment(suggestedText);
  
  // Clear form and status
  commentInput.value = '';
  clearStatus();
  
  // Show success message
  showStatus('allowed', '✅ Comment posted! Thank you for using the suggested text.');
  
  // Update submit button state
  updateSubmitButton();
  
  // Clear success message after a moment
  setTimeout(clearStatus, 4000);
}

/**
 * Clears the status display
 */
function clearStatus() {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.className = 'status';
    statusEl.innerHTML = '';
  }
}