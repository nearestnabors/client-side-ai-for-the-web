/**
 * Comment Moderation
 * Uses AI to evaluate comments for toxicity and suggest improvements
 */

import { updateSubmitButton, escapeHtml, handleError, createApiError, getElement, showSuccessNotification, showStatusNotification, hideElement, showElement, registerEventHandler } from '/common/js/ui-helpers.js';
import { getApiKey } from '/common/js/api-key.js';
import { parseGeminiResponse } from './gemini-helpers.js';

// Constants
const MAX_OUTPUT_TOKENS = 3000;
const AI_TEMPERATURE = 0.3;

// Store the original problematic comment for regeneration
let originalProblematicComment = null;

/**
 * Handles comment form submission
 * Validates the comment with AI before posting
 * @param {Event} e - Form submission event
 */
export async function handleCommentSubmit(e) {
  if (!e || typeof e.preventDefault !== 'function') {
    throw new Error('Valid event object with preventDefault is required');
  }
  
  e.preventDefault();
  
  const commentEl = getElement('comment');
  const comment = commentEl.value.trim();
  if (!comment) return;
  
  // Hide textarea and replace button with processing message
  hideCommentForm();
  showProcessingMessage();
  
  try {
    // Get current image context from the posted image in the DOM
    const postedImg = document.getElementById('postedImage');
    const imageDescription = postedImg ? postedImg.alt : null;
    const analysis = await analyzeComment(comment, imageDescription);
    
    if (analysis.isProblematic) {
      // Show blocked status and setup suggestion editing in the comment form
      showStatus({
        type: 'blocked',
        title: '⚠️ Consider Revising',
        message: analysis.reason
      });
      showSuggestionForm(analysis.suggestion);
    } else {
      // Accept good comments and post them
      addComment(comment);
      
      // Show success notification and reset form
      showStatusNotification('success', '💬 Comment posted successfully!');
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
 * @param {string} imageDescription - Optional description of the image being commented on
 * @returns {Object} Analysis result with isProblematic, reason, and suggestion
 */
export async function analyzeComment(comment, imageDescription = null) {
  const prompt = `You are a comment moderator for a constructive discussion platform. Analyze this comment and flag it as problematic if it contains:

- Personal attacks, insults, or harassment
- Hate speech or discriminatory language  
- Excessive negativity without constructive feedback
- Hostile, aggressive, or inflammatory tone
- Comments that could discourage participation (like "Hate it!" or "This sucks!" without explanation)
- Bad faith arguments or trolling behavior

Even simple negative statements should be flagged if they don't provide constructive feedback or seem designed to be discouraging.

${imageDescription ? `Context: This comment is about an image described as: "${imageDescription}"\n\n` : ''}Return only JSON: {"isProblematic": true/false, "reason": "brief reason if problematic", "suggestion": "Create an alternative post that captures the same intent but is more respectful and constructive. Keep in mind, this is a discussion platform about the appearance of photos, not about philosophical disagreements. The suggestion should be written as though by the author of the original comment, matching their tone and style but changing the content to be more respectful and constructive"}

Comment to analyze: "${comment.replace(/"/g, '\\"')}"`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${getApiKey()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: AI_TEMPERATURE
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
      const error = new Error('Invalid response format - no JSON object found');
      handleError(error, `Comment analysis - no JSON in response: ${responseText}`);
      throw error;
    }
  } catch (parseError) {
    const error = new Error(`Invalid response format from AI: ${parseError.message}`);
    handleError(parseError, `Comment analysis JSON parsing - Response: ${responseText}`);
    throw error;
  }
}

/**
 * Shows status messages to the user with a simple, safe approach
 * @param {Object} config - Status configuration object
 * @param {string} config.type - Status type: 'checking', 'blocked', 'allowed', 'error'
 * @param {string} config.message - Main message to display
 * @param {string} [config.title] - Optional title for blocked/error states
 */
function showStatus(config) {
  const { type, message, title = null } = config;
  const statusEl = getElement('status');
  statusEl.className = `status show ${type}`;
  
  // Clear previous content
  statusEl.innerHTML = '';
  
  // Create content safely using DOM methods
  if (title) {
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    statusEl.appendChild(titleEl);
  }
  
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  statusEl.appendChild(messageEl);
}

/**
 * Regenerates a new suggestion for the blocked comment
 */
export function regenerateSuggestion() {
  // Regenerating comment suggestion for blocked comment
  
  // Get the original problematic comment from storage
  const originalComment = originalProblematicComment;
  if (!originalComment) {
    const error = new Error('Cannot regenerate - original comment not found');
    handleError(error, 'Suggestion regeneration');
    showStatus({ type: 'error', message: 'Unable to regenerate suggestion. Please try canceling and resubmitting.' });
    return;
  }
  
  // Hide comment form during regeneration
  hideCommentForm();
  
  // Show regenerating status
  showStatus({ type: 'checking', message: '🔄 Generating a new suggestion...' });
  
  // Generate a new suggestion for the original problematic comment
  const postedImg = document.getElementById('postedImage');
  const imageDescription = postedImg ? postedImg.alt : null;
  analyzeComment(originalComment, imageDescription)
    .then(analysis => {
      if (analysis.isProblematic && analysis.suggestion) {
        showStatus({ type: 'blocked', title: '⚠️ Consider Revising', message: analysis.reason });
        // Show the suggestion form with the new suggestion
        showSuggestionForm(analysis.suggestion, originalComment);
      } else {
        // This shouldn't happen since we're re-analyzing the original problematic comment
        // But if it does, show an error and restore the form
        showStatus({ type: 'error', message: 'Unable to generate a new suggestion. Please try again.' });
        showCommentForm();
      }
    })
    .catch(error => {
      const errorMsg = handleError(error, 'Suggestion regeneration');
      showStatus({ type: 'error', message: errorMsg });
      // Show form again on error
      showCommentForm();
    });
}

/**
 * Submits the suggested comment text
 */
export function submitSuggestion() {
  const commentEl = getElement('comment');
  
  const suggestedText = commentEl.value.trim();
  
  // Submitting AI-suggested comment
  
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
  hideElement('comment');
  hideElement('btnSubmit');
}

/**
 * Shows the comment form
 */
function showCommentForm() {
  const submitBtn = getElement('btnSubmit');
  
  showElement('comment');
  if (submitBtn) {
    showElement(submitBtn);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Comment';
  }
  
  // Hide suggestion-specific elements
  hideElement('suggestionActions');
  hideElement('suggestionHeader');
  hideElement('originalReference');
  
  updateSubmitButton();
}

/**
 * Creates or shows the suggestion header element
 */
function createSuggestionHeader() {
  let suggestionHeader = document.getElementById('suggestionHeader');
  if (!suggestionHeader) {
    suggestionHeader = document.createElement('h3');
    suggestionHeader.id = 'suggestionHeader';
    suggestionHeader.className = 'suggestion-header';
    suggestionHeader.textContent = '💡 Try this instead';
    
    // Insert before the form group
    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.parentNode.insertBefore(suggestionHeader, formGroup);
    }
  }
  showElement(suggestionHeader);
  return suggestionHeader;
}

/**
 * Creates or updates the original comment reference
 */
function createOriginalReference(originalComment) {
  let originalReference = document.getElementById('originalReference');
  if (!originalReference) {
    originalReference = document.createElement('p');
    originalReference.id = 'originalReference';
    originalReference.className = 'original-comment-reference';
    
    // Insert after the form group
    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.parentNode.insertBefore(originalReference, formGroup.nextSibling);
    }
  }
  originalReference.textContent = `Original post: "${originalComment}"`;
  showElement(originalReference);
  return originalReference;
}

/**
 * Creates suggestion action buttons (regenerate, submit, cancel)
 */
function createSuggestionActions() {
  let suggestionActions = document.getElementById('suggestionActions');
  if (!suggestionActions) {
    suggestionActions = document.createElement('div');
    suggestionActions.id = 'suggestionActions';
    suggestionActions.className = 'button-group';
    
    // Create buttons with proper event listeners
    const regenerateBtn = document.createElement('button');
    regenerateBtn.type = 'button';
    regenerateBtn.className = 'btn_suggestion';
    regenerateBtn.textContent = '🔄 Regenerate';
    regenerateBtn.addEventListener('click', regenerateSuggestion);
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn_suggestion btn_submit';
    submitBtn.textContent = '✅ Submit';
    submitBtn.addEventListener('click', submitSuggestion);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn_suggestion';
    cancelBtn.textContent = '❌ Cancel';
    cancelBtn.addEventListener('click', cancelSuggestion);
    
    suggestionActions.appendChild(regenerateBtn);
    suggestionActions.appendChild(submitBtn);
    suggestionActions.appendChild(cancelBtn);
    
    // Insert after the original reference
    const originalReference = document.getElementById('originalReference');
    if (originalReference) {
      originalReference.parentNode.insertBefore(suggestionActions, originalReference.nextSibling);
    }
  }
  
  showElement(suggestionActions, 'flex');
  return suggestionActions;
}

/**
 * Shows the suggestion editing form using the main comment textarea
 */
function showSuggestionForm(suggestion, originalComment = null) {
  const commentEl = getElement('comment');
  
  // If no original comment provided, get it from the current textarea value
  if (!originalComment) {
    originalComment = commentEl ? commentEl.value : '';
  }
  
  // Store original comment for regeneration
  originalProblematicComment = originalComment;
  
  // Set up UI elements
  createSuggestionHeader();
  
  // Show the comment textarea with the suggestion
  if (commentEl) {
    commentEl.value = suggestion;
    showElement(commentEl);
  }
  
  createOriginalReference(originalComment);
  
  // Replace the submit button with suggestion actions
  hideElement('btnSubmit');
  createSuggestionActions();
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
    showElement(commentEl);
  }
  
  const submitBtn = getElement('btnSubmit');
  if (submitBtn) {
    showElement(submitBtn);
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Submit Comment';
  }
  
  // Hide suggestion-specific elements
  hideElement('suggestionActions');
  hideElement('suggestionHeader');
  hideElement('originalReference');
  
  updateSubmitButton();
}

/**
 * Cancels suggestion editing and returns to empty comment form
 */
export function cancelSuggestion() {
  // User cancelled suggestion editing
  
  // Clear the stored original comment
  originalProblematicComment = null;
  
  // Clear status and show empty form
  clearStatus();
  resetCommentForm();
}

/**
 * Adds a new comment to the display
 * @param {string} commentText - The comment text to add
 */
function addComment(commentText) {
  const commentsSection = getElement('commentsSection');
  const commentsList = getElement('commentsList');
  const commentsHeader = getElement('commentsHeader');
  
  // Show the comments section
  showElement(commentsSection);
  if (commentsHeader) {
    showElement(commentsHeader);
  }
  
  // Create the comment element
  const commentItem = document.createElement('div');
  commentItem.className = 'comment-item';
  
  // Format the current date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  // Build the comment HTML
  commentItem.innerHTML = `
    <div class="comment-text">${escapeHtml(commentText)}</div>
    <div class="comment-meta">
      <span class="comment-date">${dateStr}</span>
    </div>
  `;
  
  commentsList.appendChild(commentItem);
  
  // Scroll to the new comment
  commentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Register event handlers to avoid circular dependencies
registerEventHandler('handleCommentSubmit', handleCommentSubmit);
