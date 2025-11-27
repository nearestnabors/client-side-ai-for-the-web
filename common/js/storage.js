/**
 * Local Storage Management
 * Handles saving and loading comments from browser storage
 * Note: Images are not stored to avoid localStorage quota issues
 */

import { escapeHtml, getElement } from './ui-helpers.js';

/**
 * Adds a new comment to the display and saves to localStorage
 * @param {string} commentText - The comment text to add
 */
export function addComment(commentText) {
  const commentsSection = getElement('commentsSection');
  const commentsList = getElement('commentsList');
  const commentsHeader = getElement('commentsHeader');
  
  // Show the comments section
  commentsSection.style.display = 'block';
  if (commentsHeader) {
    commentsHeader.style.display = 'block';
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
  console.log('💾 Saving posted image to localStorage...');
  
  let postedImages = [];
  const saved = localStorage.getItem('postedImages');
  if (saved) {
    try {
      postedImages = JSON.parse(saved);
    } catch (error) {
      console.error('Error parsing posted images:', error);
      postedImages = [];
    }
  }
  
  postedImages.unshift(imageData); // Add to beginning (newest first)
  
  // Keep only the last 5 images to avoid localStorage quota issues
  if (postedImages.length > 5) {
    postedImages = postedImages.slice(0, 5);
  }
  
  localStorage.setItem('postedImages', JSON.stringify(postedImages));
  console.log('✅ Posted image saved');
}

/**
 * Loads posted images from localStorage and displays them
 */
export function loadPostedImages() {
  console.log('📂 Loading posted images from localStorage...');
  
  const saved = localStorage.getItem('postedImages');
  if (!saved) {
    console.log('No posted images found - keeping upload section visible');
    return;
  }
  
  try {
    const postedImages = JSON.parse(saved);
    
    if (postedImages.length > 0) {
      console.log(`✅ Found ${postedImages.length} posted images`);
      
      postedImages.forEach(imageData => {
        window.displayPostedImage(imageData);
      });
      
      // Hide upload section since we have posted images
      const uploadSection = getElement('uploadSection');
      uploadSection.style.display = 'none';
      console.log('📦 Upload section hidden - images already posted');
      
      // Show comment section if images exist
      window.showCommentSection();
    }
  } catch (error) {
    console.error('Error loading posted images:', error);
  }
}

/**
 * Clears all posted images from localStorage
 * Called on page refresh according to requirements.
 * Note: Does not manipulate DOM as it may be called during page unload
 * when DOM elements are unavailable.
 */
export function clearPostedImages() {
  console.log('🧹 Clearing all posted images from localStorage...');
  localStorage.removeItem('postedImages');
  console.log('✅ Posted images cleared from storage');
}

// Make functions globally available for cross-module compatibility
window.savePostedImage = savePostedImage;
window.loadPostedImages = loadPostedImages;
window.clearPostedImages = clearPostedImages;