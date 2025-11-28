/**
 * Local Storage Management
 * Handles saving and loading comments from browser storage
 * Note: Images are not stored to avoid localStorage quota issues
 */

import { escapeHtml, getElement, hideElement, showElement } from './ui-helpers.js';

// Constants
const MAX_POSTED_IMAGES = 5;

/**
 * Adds a new comment to the display and saves to localStorage
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
  
  // Save all comments to localStorage
  saveComments();
  
  // Scroll to the new comment
  commentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Saves all current comments to localStorage
 * Extracts text and date from each comment element
 */
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

/**
 * Loads saved comments from localStorage on page load
 * Recreates the comment elements in the UI
 */
export function loadComments() {
  const saved = localStorage.getItem('comments');
  if (!saved) return;
  
  try {
    const comments = JSON.parse(saved);
    const commentsSection = getElement('commentsSection');
    const commentsList = getElement('commentsList');
    
    if (comments.length > 0) {
      showElement(commentsSection);
      
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
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}


/**
 * Saves a posted image to localStorage
 * @param {Object} imageData - The image data to save
 */
export function savePostedImage(imageData) {
  
  let postedImages = [];
  const saved = localStorage.getItem('postedImages');
  if (saved) {
    try {
      postedImages = JSON.parse(saved);
    } catch (error) {
      // Error parsing posted images, start with empty array
      postedImages = [];
    }
  }
  
  postedImages.unshift(imageData); // Add to beginning (newest first)
  
  // Keep only the last N images to avoid localStorage quota issues
  if (postedImages.length > MAX_POSTED_IMAGES) {
    postedImages = postedImages.slice(0, MAX_POSTED_IMAGES);
  }
  
  localStorage.setItem('postedImages', JSON.stringify(postedImages));
}

/**
 * Clears all posted images from localStorage
 * Called on page refresh according to requirements.
 * Note: Does not manipulate DOM as it may be called during page unload
 * when DOM elements are unavailable.
 */
export function clearPostedImages() {
  // Clear all posted images from localStorage on page refresh
  localStorage.removeItem('postedImages');
}
