/**
 * Local Storage Management
 * Handles saving and loading comments from browser storage
 * Note: Images are not stored to avoid localStorage quota issues
 */

/**
 * Adds a new comment to the display and saves to localStorage
 * @param {string} commentText - The comment text to add
 */
function addComment(commentText) {
  const commentsSection = document.getElementById('commentsSection');
  const commentsList = document.getElementById('commentsList');
  const commentsHeader = document.getElementById('commentsHeader');
  
  if (!commentsSection || !commentsList) {
    console.error('Comments section elements not found');
    return;
  }
  
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
  
  // Show the clear all button
  const clearAllBtn = document.getElementById('clearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.style.display = 'block';
  }
  
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
      
      // Show the clear all button if there are comments
      const clearAllBtn = document.getElementById('clearAllBtn');
      if (clearAllBtn) {
        clearAllBtn.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

/**
 * Clears all comments from display and localStorage
 */
function clearAllComments() {
  const commentsList = document.getElementById('commentsList');
  const commentsSection = document.getElementById('commentsSection');
  const clearAllBtn = document.getElementById('clearAllBtn');
  
  if (!commentsList || !commentsSection) {
    console.error('Comments section elements not found');
    return;
  }
  
  commentsList.innerHTML = '';
  commentsSection.style.display = 'none';
  if (clearAllBtn) {
    clearAllBtn.style.display = 'none';
  }
  
  localStorage.removeItem('comments');
}