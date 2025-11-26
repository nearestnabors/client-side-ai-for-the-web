/**
 * Main Application Initialization
 * Coordinates the loading and setup of all app features
 */

/**
 * Initializes the application when the page loads
 * Sets up all modules and loads saved data
 */
window.addEventListener('load', () => {
  // Load saved API key from storage
  loadApiKey();
  
  // Load posted images from storage
  loadPostedImages();
  
  // Load any saved comments
  loadComments();
  
  // Set up all event listeners
  setupEventListeners();
  
  // Update UI based on current state
  updateUIState();
  
  console.log('🎉 AI-powered image analysis and comment moderation app initialized');
});

// Clear storage on page refresh as per requirements
window.addEventListener('beforeunload', () => {
  console.log('🧹 Page refreshing - clearing posted images and comments...');
  clearPostedImages();
  localStorage.removeItem('comments');
});