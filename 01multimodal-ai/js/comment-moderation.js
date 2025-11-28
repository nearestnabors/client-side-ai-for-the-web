/**
 * Comment Moderation
 * Uses AI to evaluate comments for toxicity and suggest improvements
 */

import { addComment } from '/common/js/storage.js';
import { updateSubmitButton, escapeHtml, handleError, createApiError, getElement, showSuccessNotification, parseGeminiResponse } from '/common/js/ui-helpers.js';

// Store the original problematic comment for regeneration
let originalProblematicComment = null;

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
  
  // Hide textarea and replace button with processing message
  hideCommentForm();
  showProcessingMessage();
  
  try {
    const analysis = await analyzeComment(comment);
    
    if (analysis.isProblematic) {
      // Show blocked status and setup suggestion editing in the comment form
      showStatus({
        type: 'blocked',
        message: `<h3>⚠️ Consider Revising</h3><p>${analysis.reason}</p>`
      });
      showSuggestionForm(analysis.suggestion);
    } else {
      // Accept good comments and post them
      addComment(comment);
      
      // Show success notification and reset form
      showSuccessNotification('💬 Comment posted successfully!');
      clearStatus();
      resetCommentForm();
    }
  } catch (error) {
    const errorMsg = handleError(error, 'Comment analysis');
    showStatus({ type: 'error', message: errorMsg });
    // Show form again on error
    showCommentForm();
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
  "suggestion": "Rephrase the comment to be more constructive and respectful but capture the poster's original intent."
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
  const responseText = parseGeminiResponse(data, 'Comment analysis');
  
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
  
}

/**
 * Regenerates a new suggestion for the blocked comment
 */
export function regenerateSuggestion() {
  console.log('🔄 Regenerating comment suggestion');
  
  // Get the original problematic comment from storage
  const originalComment = originalProblematicComment;
  if (!originalComment) {
    console.error('Cannot regenerate - original comment not found');
    showStatus({ type: 'error', message: 'Unable to regenerate suggestion. Please try canceling and resubmitting.' });
    return;
  }
  
  // Show regenerating status
  showStatus({ type: 'checking', message: '🔄 Generating a new suggestion...' });
  
  // Generate a new suggestion for the original problematic comment
  analyzeComment(originalComment)
    .then(analysis => {
      if (analysis.isProblematic && analysis.suggestion) {
        showStatus({ type: 'blocked', message: `<h3>⚠️ Consider Revising</h3><p>${analysis.reason}</p>` });
        // Update the textarea with the new suggestion (without recreating the whole interface)
        const commentEl = getElement('comment');
        if (commentEl) {
          commentEl.value = analysis.suggestion;
        }
      } else {
        // This shouldn't happen since we're re-analyzing the original problematic comment
        // But if it does, show an error
        showStatus({ type: 'error', message: 'Unable to generate a new suggestion. Please try again.' });
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
  const commentEl = getElement('comment');
  
  const suggestedText = commentEl.value.trim();
  
  console.log('✅ Submitting AI-suggested comment');
  
  // Use the suggested text and post the comment
  addComment(suggestedText);
  
  // Show success notification and reset form
  showSuccessNotification('💬 Comment posted successfully!');
  clearStatus();
  resetCommentForm();
}

/**
 * Clears the status display
 */
function clearStatus() {
  const statusEl = getElement('status');
  statusEl.className = 'status';
  statusEl.innerHTML = '';
}

/**
 * Hides the comment form during processing/suggestion editing
 */
function hideCommentForm() {
  const commentEl = getElement('comment');
  const submitBtn = getElement('btnSubmit');
  
  if (commentEl) commentEl.style.display = 'none';
  if (submitBtn) submitBtn.style.display = 'none';
}

/**
 * Shows the comment form
 */
function showCommentForm() {
  const commentEl = getElement('comment');
  const submitBtn = getElement('btnSubmit');
  
  if (commentEl) commentEl.style.display = 'block';
  if (submitBtn) {
    submitBtn.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Comment';
  }
  
  // Hide suggestion-specific elements
  const suggestionActions = document.getElementById('suggestionActions');
  if (suggestionActions) {
    suggestionActions.style.display = 'none';
  }
  
  const suggestionHeader = document.getElementById('suggestionHeader');
  if (suggestionHeader) {
    suggestionHeader.style.display = 'none';
  }
  
  const originalReference = document.getElementById('originalReference');
  if (originalReference) {
    originalReference.style.display = 'none';
  }
  
  updateSubmitButton();
}

/**
 * Shows the suggestion editing form using the main comment textarea
 */
function showSuggestionForm(suggestion, originalComment = null) {
  const commentEl = getElement('comment');
  const submitBtn = getElement('btnSubmit');
  
  // If no original comment provided, get it from the current textarea value
  if (!originalComment) {
    originalComment = commentEl ? commentEl.value : '';
  }
  
  // Store original comment for regeneration
  originalProblematicComment = originalComment;
  
  // Create suggestion header if it doesn't exist
  let suggestionHeader = document.getElementById('suggestionHeader');
  if (!suggestionHeader) {
    suggestionHeader = document.createElement('h3');
    suggestionHeader.id = 'suggestionHeader';
    suggestionHeader.innerHTML = '💡 Try this instead...';
    suggestionHeader.style.margin = '20px 0 8px 0';
    suggestionHeader.style.color = 'var(--color-text-primary)';
    suggestionHeader.style.fontSize = 'var(--font-size-base)';
    suggestionHeader.style.fontWeight = 'var(--font-weight-bold)';
    
    // Insert before the form group
    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.parentNode.insertBefore(suggestionHeader, formGroup);
    }
  }
  suggestionHeader.style.display = 'block';
  
  // Show the comment textarea with the suggestion
  if (commentEl) {
    commentEl.value = suggestion;
    commentEl.style.display = 'block';
  }
  
  // Create or update original comment reference
  let originalReference = document.getElementById('originalReference');
  if (!originalReference) {
    originalReference = document.createElement('p');
    originalReference.id = 'originalReference';
    originalReference.style.fontSize = 'var(--font-size-xs)';
    originalReference.style.color = 'var(--color-text-muted)';
    originalReference.style.margin = '8px 0 0 0';
    originalReference.style.fontStyle = 'italic';
    
    // Insert after the form group
    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.parentNode.insertBefore(originalReference, formGroup.nextSibling);
    }
  }
  originalReference.innerHTML = `Original post: "${escapeHtml(originalComment)}"`;
  originalReference.style.display = 'block';
  
  // Replace the submit button with suggestion actions
  if (submitBtn) {
    submitBtn.style.display = 'none';
  }
  
  // Create suggestion actions if they don't exist
  let suggestionActions = document.getElementById('suggestionActions');
  if (!suggestionActions) {
    suggestionActions = document.createElement('div');
    suggestionActions.id = 'suggestionActions';
    suggestionActions.className = 'button-group';
    suggestionActions.innerHTML = `
      <button type="button" class="btn_suggestion" onclick="regenerateSuggestion()">🔄 Regenerate</button>
      <button type="button" class="btn_suggestion btn_submit" onclick="submitSuggestion()">✅ Submit</button>
      <button type="button" class="btn_suggestion" onclick="cancelSuggestion()">❌ Cancel</button>
    `;
    
    // Insert after the original reference
    if (originalReference) {
      originalReference.parentNode.insertBefore(suggestionActions, originalReference.nextSibling);
    }
  }
  
  suggestionActions.style.display = 'flex';
}

/**
 * Shows processing message during AI analysis
 */
function showProcessingMessage() {
  showStatus({ type: 'checking', message: '🔍 Analyzing your comment for tone and constructiveness...' });
}

/**
 * Resets the comment form to empty state
 */
function resetCommentForm() {
  const commentEl = getElement('comment');
  if (commentEl) {
    commentEl.value = '';
    commentEl.style.display = 'block';
  }
  
  const submitBtn = getElement('btnSubmit');
  if (submitBtn) {
    submitBtn.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Comment';
  }
  
  // Hide suggestion-specific elements
  const suggestionActions = document.getElementById('suggestionActions');
  if (suggestionActions) {
    suggestionActions.style.display = 'none';
  }
  
  const suggestionHeader = document.getElementById('suggestionHeader');
  if (suggestionHeader) {
    suggestionHeader.style.display = 'none';
  }
  
  const originalReference = document.getElementById('originalReference');
  if (originalReference) {
    originalReference.style.display = 'none';
  }
  
  updateSubmitButton();
}

/**
 * Cancels suggestion editing and returns to empty comment form
 */
export function cancelSuggestion() {
  console.log('❌ User cancelled suggestion editing');
  
  // Clear the stored original comment
  originalProblematicComment = null;
  
  // Clear status and show empty form
  clearStatus();
  resetCommentForm();
}

// Make functions globally available for onclick handlers
window.regenerateSuggestion = regenerateSuggestion;
window.submitSuggestion = submitSuggestion;
window.cancelSuggestion = cancelSuggestion;
window.handleCommentSubmit = handleCommentSubmit;