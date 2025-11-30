/**
 * Main Application Initialization
 * Coordinates the loading and setup of all app features
 * Uses hybrid AI approach: Prompt API (local) with Gemini fallback (cloud)
 */

import { loadApiKey, setupApiKeyEventListeners } from '/common/js/api-key.js';
import { setupEventListeners, updateUIState } from '/common/js/ui-helpers.js';
import { setAIGenerator } from '/common/js/image-processing.js';
import { generateHybridAltText } from './hybrid-alt-text-gen.js';
import { isPromptApiAvailable, getPromptApiCapabilities } from './local-ai-helpers.js';
// Import hybrid comment moderation module to ensure it loads and registers handlers
import './hybrid-comment-moderation.js';

// Constants
const INIT_DELAY_MS = 50; // Delay to ensure all modules are loaded
const FADE_IN_DELAY_MS = 200; // Delay before container fade-in animation

/**
 * Initializes the application when the page loads
 * Sets up all modules and loads saved data
 * Detects AI capabilities and configures hybrid system
 */
window.addEventListener('load', async () => {
  // Configure hybrid AI generator via dependency injection
  setAIGenerator(generateHybridAltText);
  
  // Check Prompt API availability and log capabilities
  if (isPromptApiAvailable()) {
    console.log('🔬 Prompt API detected! Hybrid mode enabled.');
    try {
      const capabilities = await getPromptApiCapabilities();
      if (capabilities) {
        console.log('✅ Prompt API capabilities:', capabilities);
      }
    } catch (error) {
      console.warn('⚠️ Failed to get Prompt API capabilities:', error);
    }
  } else {
    console.log('ℹ️ Prompt API not available. Cloud-only mode.');
  }
  
  // Load saved API key from storage (still needed for Gemini fallback)
  loadApiKey();
  
  // Set up API key event listeners first (these don't depend on other modules)
  setupApiKeyEventListeners();
  
  // Defer other event listeners to ensure all modules are loaded
  setTimeout(() => {
    // Set up all event listeners
    setupEventListeners();
    
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