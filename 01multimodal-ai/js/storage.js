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
      
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}


/**
 * Saves a posted image to localStorage
 * @param {Object} imageData - The image data to save
 */
window.savePostedImage = function savePostedImage(imageData) {
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
window.loadPostedImages = function loadPostedImages() {
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
        displayPostedImage(imageData);
      });
      
      // Hide upload section since we have posted images
      const uploadSection = document.getElementById('uploadSection');
      if (uploadSection) {
        uploadSection.style.display = 'none';
        console.log('📦 Upload section hidden - images already posted');
      }
      
      // Show comment section if images exist
      showCommentSection();
    }
  } catch (error) {
    console.error('Error loading posted images:', error);
  }
}


/**
 * Clears all posted images (called on page refresh according to requirements)
 */
window.clearPostedImages = function clearPostedImages() {
  console.log('🧹 Clearing all posted images from localStorage...');
  localStorage.removeItem('postedImages');
  
  // Show upload section again when images are cleared
  const uploadSection = document.getElementById('uploadSection');
  const uploadArea = document.getElementById('uploadArea');
  if (uploadSection) {
    uploadSection.style.display = 'block';
    console.log('📦 Upload section shown - no posted images');
  }
  
  // Ensure upload area is visible
  if (uploadArea) {
    uploadArea.style.display = 'block';
    console.log('📦 Upload area shown - ready for new uploads');
  }
}