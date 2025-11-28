/**
 * In-Memory Data Management
 * Handles comments and image data in memory (no persistence)
 */

import { escapeHtml, getElement, hideElement, showElement } from './ui-helpers.js';

/**
 * Adds a new comment to the display
 * @param {string} commentText - The comment text to add
 */
export function addComment(commentText) {
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

// No storage functions needed - everything stays in memory during the session
