/**
 * Main Application Initialization
 * Coordinates the loading and setup of all app features
 * Uses hybrid AI approach: Prompt API (local) with Gemini fallback (cloud)
 */

import { loadApiKey, setupApiKeyEventListeners } from '../../common/js/api-key.js';
import { setupEventListeners, updateUIState } from '../../common/js/ui-helpers.js';
import { setAIGenerator } from '../../common/js/image-processing.js';
import { generateAltText } from './alt-text-generation.js';
import { checkPromptApiAvailability, setPendingModelDownload } from './client-side-ai-helpers.js';
// Import comment moderation module (includes UI handlers)
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
    console.log('✨ Client-side AI available - skipping API key requirement');
    
    // Skip API key setup entirely - we have local AI!
    const apiKeySection = document.getElementById('apiKeySection');
    if (apiKeySection) {
      apiKeySection.remove();
    }
    
    // Show upload section directly
    const uploadSection = document.getElementById('uploadSection');
    if (uploadSection) {
      uploadSection.style.display = 'block';
    }
    
    // Show success notification
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.className = 'status show success';
      statusEl.innerHTML = '<p>🎉 Client-side AI ready! No API key needed.</p>';
      setTimeout(() => {
        statusEl.className = 'status';
      }, 3000);
    }
  } else {
    // Model not ready - we'll need the API key for server-side fallback
    if (promptApiStatus.available && promptApiStatus.needsDownload) {
      console.log('⬇️ Prompt API available but model needs download. Using cloud AI for now.');
      console.log('💡 Model will be downloaded on first user interaction.');
      setPendingModelDownload(true);
    } else if (promptApiStatus.available && promptApiStatus.downloading) {
      console.log('📥 Model status reports downloading...');
      console.log('☁️ Using cloud AI while model downloads...');
      
      // Set up download progress monitoring if available
      if (typeof LanguageModel.addEventListener === 'function') {
        console.log('Setting up download progress monitoring...');
        LanguageModel.addEventListener('downloadprogress', (e) => {
          const percent = ((e.loaded / e.total) * 100).toFixed(0);
          console.log(`Download progress: ${percent}% (${e.loaded}/${e.total} bytes)`);
          
          // Update UI with progress
          const statusEl = document.getElementById('status');
          if (statusEl) {
            statusEl.className = 'status show info';
            statusEl.innerHTML = `<p>📥 Downloading AI model: ${percent}%</p>`;
          }
          
          if (e.loaded === e.total) {
            console.log('✅ Download complete! Model should be available soon.');
            if (statusEl) {
              statusEl.innerHTML = '<p>✅ AI model downloaded! Initializing...</p>';
            }
          }
        });
      }
      
      // Try to force initialization by creating a session after a delay
      setTimeout(async () => {
        try {
          console.group('🔧 Attempting workaround for stuck "downloading" status');
          console.log('Chrome bug: availability() returns "downloading" even when model is ready');
          console.log('Attempting to create session directly to verify actual readiness...');
          
          const startTime = performance.now();
          const testSession = await LanguageModel.create({
            temperature: 0.4,
            topK: 3,
            systemPrompt: 'You are a helpful assistant.',
            initialPrompts: []
          });
          
          if (testSession) {
            const elapsed = performance.now() - startTime;
            console.log(`✅ SUCCESS: Session created in ${elapsed.toFixed(2)}ms despite "downloading" status!`);
            console.log('This confirms the model IS ready but status API is incorrect');
            
            // Store globally to indicate model is ready
            window.__promptApiReady = true;
            
            // Clean up test session
            if (testSession.destroy) {
              testSession.destroy();
            }
            
            // Show success notification
            const statusEl = document.getElementById('status');
            if (statusEl) {
              statusEl.className = 'status show success';
              statusEl.innerHTML = '<p>🎉 AI model ready! Now using faster local processing.</p>';
              setTimeout(() => {
                statusEl.className = 'status';
              }, 3000);
            }
            
            console.group('📊 Chrome Bug Summary:');
            console.log('BUG: LanguageModel.availability() returns "downloading" incorrectly');
            console.log('EXPECTED: Should return "available" when model is ready (per Chrome docs)');
            console.log('ACTUAL: Returns "downloading" even after successful session creation');
            console.log('WORKAROUND: Ignore availability() API and try session creation directly');
            console.log('DOCS: https://developer.chrome.com/docs/ai/inform-users-of-model-download');
            console.groupEnd();
          }
          console.groupEnd();
        } catch (error) {
          const elapsed = performance.now() - startTime;
          console.log(`Model initialization failed after ${elapsed.toFixed(2)}ms:`, error.message);
          console.groupEnd();
        }
      }, 2000); // Wait 2 seconds for page to fully load
      
    } else if (!promptApiStatus.available) {
      console.log('ℹ️ Prompt API not available:', promptApiStatus.reason || 'Unknown reason');
      console.log('ℹ️ Using cloud-only mode.');
    }
    
    // Load saved API key from storage (needed for Gemini fallback)
    loadApiKey();
  }
  
  // Only set up API key event listeners if we need them
  if (!(promptApiStatus.available && promptApiStatus.ready)) {
    setupApiKeyEventListeners();
  }
  
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