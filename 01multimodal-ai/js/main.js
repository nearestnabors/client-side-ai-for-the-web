/**
 * Main Application Initialization
 * Coordinates the loading and setup of all app features
 */

import { loadApiKey, setupApiKeyEventListeners } from './api-key.js';
import { loadPostedImages, clearPostedImages, loadComments } from './storage.js';
import { setupEventListeners, updateUIState } from './ui-helpers.js';
// Import other modules to ensure they load and register their global functions
import './image-upload.js';
import './comment-moderation.js';

/**
 * Initializes the application when the page loads
 * Sets up all modules and loads saved data
 */
window.addEventListener('load', () => {
  console.log('🚀 Starting app initialization...');
  
  // Load saved API key from storage
  loadApiKey();
  
  // Load posted images from storage
  loadPostedImages();
  
  // Load any saved comments
  loadComments();
  
  // Set up API key event listeners first (these don't depend on other modules)
  setupApiKeyEventListeners();
  
  // Defer other event listeners to ensure all modules are loaded
  setTimeout(() => {
    console.log('🔍 Available functions:', {
      handleFileSelect: typeof window.handleFileSelect,
      handleFile: typeof window.handleFile,
      generateAltText: typeof window.generateAltText,
      handleCommentSubmit: typeof window.handleCommentSubmit,
    });
    
    // Set up all event listeners
    setupEventListeners();
    
    // Update UI based on current state
    updateUIState();
  }, 50);
  
  console.log('🎉 AI-powered image analysis and comment moderation app initialized');
});

// Clear storage on page refresh as per requirements
window.addEventListener('beforeunload', () => {
  console.log('🧹 Page refreshing - clearing posted images and comments...');
  clearPostedImages();
  localStorage.removeItem('comments');
});