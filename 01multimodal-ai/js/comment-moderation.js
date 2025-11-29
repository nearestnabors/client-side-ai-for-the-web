/**
 * Comment Moderation
 * Uses AI to evaluate comments for toxicity and suggest improvements
 */

import { updateSubmitButton, escapeHtml, handleError, createApiError, getElement, showSuccessNotification, showStatusNotification, parseGeminiResponse, hideElement, showElement } from '/common/js/ui-helpers.js';
import { getApiKey } from '/common/js/api-key.js';

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
  
  if (!getApiKey()) {
    showStatus({ type: 'error', message: '❌ Please configure your Google AI API key first' });
    return;
  }
  
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
        message: `<h3>⚠️ Consider Revising</h3><p>${analysis.reason}</p>`
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
async function analyzeComment(comment, imageDescription = null) {
  const prompt = `You are a comment moderator for a constructive discussion platform. Analyze this comment and flag it as problematic if it contains:

- Personal attacks, insults, or harassment
- Hate speech or discriminatory language  
- Excessive negativity without constructive feedback
- Hostile, aggressive, or inflammatory tone
- Comments that could discourage participation (like "Hate it!" or "This sucks!" without explanation)
- Bad faith arguments or trolling behavior

Even simple negative statements should be flagged if they don't provide constructive feedback or seem designed to be discouraging.

${imageDescription ? `Context: This comment is about an image described as: "${imageDescription}"\n\n` : ''}Return only JSON: {"isProblematic": true/false, "reason": "brief reason if problematic", "suggestion": "Create an alternative post that captures the same intent but is more respectful and constructive. Keep in mind, this is a discussion platform about appearance of photos, not about philosphical disagreements. The suggestion should be written as though by the author of the original comment, matching their tone and style but changing the content to be more respectful and constructive."}

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
        maxOutputTokens: 1500,
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
 * @param {string} config.message - Main message to display (may contain HTML)
 * @param {string} [config.suggestion] - Optional suggestion text for alternatives
 */
function showStatus(config) {
  const { type, message, suggestion = null } = config;
  const statusEl = getElement('status');
  statusEl.className = `status show ${type}`;
  
  // Clear previous content
  statusEl.textContent = '';
  
  // Parse HTML safely using DOMParser and create elements via DOM methods
  // This prevents XSS while allowing safe HTML structure
  const parser = new DOMParser();
  const doc = parser.parseFromString(message, 'text/html');
  const bodyContent = doc.body;
  
  // Only allow safe HTML elements (h3, p, div, span, strong, em)
  const allowedTags = ['h3', 'p', 'div', 'span', 'strong', 'em', 'br'];
  
  // Process nodes safely
  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Create text node with escaped content
      const textNode = document.createTextNode(node.textContent);
      return textNode;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // Only process allowed tags
      if (allowedTags.includes(tagName)) {
        const safeElement = document.createElement(tagName);
        
        // Copy only safe attributes (no event handlers)
        Array.from(node.attributes).forEach(attr => {
          const attrName = attr.name.toLowerCase();
          // Only allow safe attributes (no 'on*' event handlers)
          if (!attrName.startsWith('on') && 
              ['class', 'id', 'style'].includes(attrName) || 
              attrName.startsWith('data-')) {
            safeElement.setAttribute(attrName, attr.value);
          }
        });
        
        // Recursively process children
        Array.from(node.childNodes).forEach(child => {
          const processedChild = processNode(child);
          if (processedChild) {
            safeElement.appendChild(processedChild);
          }
        });
        
        return safeElement;
      }
      // Skip disallowed tags
      return null;
    }
    return null;
  };
  
  // Process all nodes from the parsed HTML
  Array.from(bodyContent.childNodes).forEach(node => {
    const processedNode = processNode(node);
    if (processedNode) {
      statusEl.appendChild(processedNode);
    }
  });
  
  // If no content was added (e.g., plain text message), use textContent as fallback
  if (statusEl.childNodes.length === 0) {
    statusEl.textContent = message;
  }
}

/**
 * Regenerates a new suggestion for the blocked comment
 */
export function regenerateSuggestion() {
  // Regenerating comment suggestion for blocked comment
  
  // Get the original problematic comment from storage
  const originalComment = originalProblematicComment;
  if (!originalComment) {
    console.error('Cannot regenerate - original comment not found');
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
        showStatus({ type: 'blocked', message: `<h3>⚠️ Consider Revising</h3><p>${analysis.reason}</p>` });
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
  
  // Create or show suggestion header
  let suggestionHeader = document.getElementById('suggestionHeader');
  if (!suggestionHeader) {
    suggestionHeader = document.createElement('h3');
    suggestionHeader.id = 'suggestionHeader';
    suggestionHeader.className = 'suggestion-header';
    suggestionHeader.innerHTML = '💡 Try this instead';
    
    // Insert before the form group
    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.parentNode.insertBefore(suggestionHeader, formGroup);
    }
  }
  showElement(suggestionHeader);
  
  // Show the comment textarea with the suggestion
  if (commentEl) {
    commentEl.value = suggestion;
    showElement(commentEl);
  }
  
  // Create or update original comment reference
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
  originalReference.innerHTML = `Original post: "${escapeHtml(originalComment)}"`;
  showElement(originalReference);
  
  // Replace the submit button with suggestion actions
  hideElement('btnSubmit');
  
  // Create suggestion actions if they don't exist
  let suggestionActions = document.getElementById('suggestionActions');
  if (!suggestionActions) {
    suggestionActions = document.createElement('div');
    suggestionActions.id = 'suggestionActions';
    suggestionActions.className = 'button-group';
    
    // Create buttons with proper event listeners instead of onclick
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
    if (originalReference) {
      originalReference.parentNode.insertBefore(suggestionActions, originalReference.nextSibling);
    }
  }
  
  showElement(suggestionActions, 'flex');
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
