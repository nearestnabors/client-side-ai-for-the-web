/**
 * Main Application Initialization
 * Coordinates the loading and setup of all app features
 * Uses hybrid AI approach: Prompt API (clientside) with Gemini fallback (serverside)
 */

import { loadApiKey, setupApiKeyEventListeners } from '../../common/js/api-key.js';
import { setupEventListeners, updateUIState } from '../../common/js/ui-helpers.js';
import { setAIGenerator } from '../../common/js/image-processing.js';
import { generateAltText } from './alt-text-gen.js';
import { checkPromptApiAvailability } from './clientside-ai-helpers.js';
// Import comment moderation module which includes UI handlers
import './comment-moderation.js';

// Constants
const INIT_DELAY_MS = 50; // Delay to ensure all modules are loaded
const FADE_IN_DELAY_MS = 200; // Delay before container fade-in animation

/**
 * Initializes the application when the page loads
 * Sets up all modules and loads saved data
 * Detects AI capabilities and configures hybrid system
 */
window.addEventListener('load', async () => {
  console.log('🚀 Application starting...');
  
  // Configure AI generator via dependency injection
  setAIGenerator(generateAltText);
  
  console.log('🔍 About to check Prompt API availability...');
  // Check Prompt API availability with proper status checking
  const promptApiStatus = await checkPromptApiAvailability();
  console.log('📋 Prompt API status result:', promptApiStatus);
  
  if (promptApiStatus.available && promptApiStatus.ready) {
    console.log('🔬 Prompt API ready! Hybrid mode enabled.');
  } else if (promptApiStatus.available && promptApiStatus.needsDownload) {
    console.log('⬇️ Prompt API available but model needs download. Using serverside AI for now.');
  } else {
    console.log('ℹ️ Prompt API not available:', promptApiStatus.reason || 'Unknown reason');
    console.log('ℹ️ Using serverside-only mode.');
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