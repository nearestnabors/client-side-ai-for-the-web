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
  
  // Clear any stored images to prevent localStorage quota issues
  // Images are handled in-memory only for this session
  localStorage.removeItem('uploadedImages');
  
  // Load any saved comments
  loadComments();
  
  // Set up all event listeners
  setupEventListeners();
  
  // Update UI based on current state
  updateUIState();
  
  console.log('AI-powered image analysis and comment moderation app initialized');
});