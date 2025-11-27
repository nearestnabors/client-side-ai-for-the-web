/**
 * Comment Moderation
 * Uses AI to evaluate comments for toxicity and suggest improvements
 */

import { addComment } from './storage.js';
import { updateSubmitButton, escapeHtml, handleError, createApiError, getElement } from './ui-helpers.js';

/**
 * Handles comment form submission
 * Validates the comment with AI before posting
 * @param {Event} e - Form submission event
 */
export async function handleCommentSubmit(e) {
  e.preventDefault();
  
  const commentEl = getElement('comment');
  const comment = commentEl.value.trim();
  if (!comment) return;
  
  if (!window.geminiApiKey) {
    showStatus({ type: 'error', message: '❌ Please configure your Google AI API key first' });
    return;
  }
  
  const submitBtn = getElement('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Checking... <span class="loading"></span>';
  
  showStatus({ type: 'checking', message: '🔍 Analyzing your comment for tone and constructiveness...' });
  
  try {
    const analysis = await analyzeComment(comment);
    
    if (analysis.isProblematic) {
      // Block problematic comments and show suggestions
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submit Comment';
      showStatus({
        type: 'blocked',
        message: `<h3>⚠️ Consider Revising</h3><p>${analysis.reason}</p>`,
        suggestion: analysis.suggestion
      });
    } else {
      // Accept good comments and post them
      addComment(comment);
      
      // Clear form and show success
      const commentInput = getElement('comment');
      commentInput.value = '';
      showStatus({ type: 'allowed', message: '✅ Comment posted! It looks constructive and respectful.' });
      
      // Reset button state
      submitBtn.innerHTML = 'Submit Comment';
      updateSubmitButton();
      
      // Clear status message after a moment
      setTimeout(() => {
        const statusEl = getElement('status');
        statusEl.className = 'status';
      }, 3000);
    }
  } catch (error) {
    const errorMsg = handleError(error, 'Comment analysis');
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Comment';
    showStatus({ type: 'error', message: errorMsg });
  }
}

/**
 * Sends a comment to AI for toxicity and tone analysis
 * @param {string} comment - The comment text to analyze
 * @returns {Object} Analysis result with isProblematic, reason, and suggestion
 */
async function analyzeComment(comment) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${window.geminiApiKey}`, {
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || createApiError(response, 'Comment analysis API'));
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
 * @param {Object} config - Status configuration object
 * @param {string} config.type - Status type: 'checking', 'blocked', 'allowed', 'error'
 * @param {string} config.message - Main message to display
 * @param {string} [config.suggestion] - Optional suggestion text for alternatives
 */
function showStatus(config) {
  const { type, message, suggestion = null } = config;
  const statusEl = getElement('status');
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
export function regenerateSuggestion() {
  console.log('🔄 Regenerating comment suggestion');
  
  const commentInput = getElement('comment');
  const originalComment = commentInput.value.trim();
  
  // Show regenerating status
  showStatus({ type: 'checking', message: '🔄 Generating a new suggestion...' });
  
  // Re-analyze the original comment to get a new suggestion
  analyzeComment(originalComment)
    .then(analysis => {
      if (analysis.isProblematic && analysis.suggestion) {
        showStatus({ type: 'blocked', message: analysis.reason, suggestion: analysis.suggestion });
      } else {
        // If it's no longer problematic, allow submission
        clearStatus();
        showStatus({ type: 'allowed', message: '✅ Comment looks good now! You can submit it.' });
        setTimeout(clearStatus, 3000);
      }
    })
    .catch(error => {
      const errorMsg = handleError(error, 'Suggestion regeneration');
      showStatus({ type: 'error', message: errorMsg });
    });
}

/**
 * Submits the suggested comment text
 */
export function submitSuggestion() {
  const suggestionEditor = getElement('suggestionEditor');
  const commentInput = getElement('comment');
  
  const suggestedText = suggestionEditor.value.trim();
  
  console.log('✅ Submitting AI-suggested comment');
  
  // Use the suggested text and post the comment
  addComment(suggestedText);
  
  // Clear form and status
  commentInput.value = '';
  clearStatus();
  
  // Show success message
  showStatus({ type: 'allowed', message: '✅ Comment posted! Thank you for using the suggested text.' });
  
  // Update submit button state
  updateSubmitButton();
  
  // Clear success message after a moment
  setTimeout(clearStatus, 4000);
}

/**
 * Clears the status display
 */
function clearStatus() {
  const statusEl = getElement('status');
  statusEl.className = 'status';
  statusEl.innerHTML = '';
}

// Make functions globally available for onclick handlers
window.regenerateSuggestion = regenerateSuggestion;
window.submitSuggestion = submitSuggestion;
window.handleCommentSubmit = handleCommentSubmit;