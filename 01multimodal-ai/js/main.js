/**
 * Main Application Initialization
 * Coordinates the loading and setup of all app features
 */

import { loadApiKey, setupApiKeyEventListeners } from '/common/js/api-key.js';
import { setupEventListeners, updateUIState } from '/common/js/ui-helpers.js';
import { setAIGenerator } from '/common/js/image-upload.js';
import { generateGeminiAltText } from './generate-alt-text.js';
// Import other modules to ensure they load and register their global functions
import './comment-moderation.js';

// Constants
const INIT_DELAY_MS = 50; // Delay to ensure all modules are loaded
const FADE_IN_DELAY_MS = 200; // Delay before container fade-in animation

/**
 * Initializes the application when the page loads
 * Sets up all modules and loads saved data
 */
window.addEventListener('load', () => {
  // Configure AI generator via dependency injection
  setAIGenerator(generateGeminiAltText);
  
  // Load saved API key from storage
  loadApiKey();
  
  // Set up API key event listeners first (these don't depend on other modules)
  setupApiKeyEventListeners();
  
  // Defer other event listeners to ensure all modules are loaded
  setTimeout(async () => {
    // Set up all event listeners (async to handle dynamic imports)
    await setupEventListeners();
    
    // Update UI based on current state
    updateUIState();
  }, INIT_DELAY_MS);
  
  // Fade in the container after initialization with a slight delay
  setTimeout(() => {
    const container = document.querySelector('.container');
    if (container) {
      container.classList.add('loaded');
    }
  }, FADE_IN_DELAY_MS);
});

// No cleanup needed - everything is in memory and will be cleared on page refresh