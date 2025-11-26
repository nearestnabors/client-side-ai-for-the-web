/**
 * Module Loader
 * Dynamically loads all JavaScript modules in the correct order
 * This keeps the HTML clean and manages dependencies in one place
 */

// Define the modules to load in dependency order
const modules = [
  'js/api-key.js',        // API key management (consolidated)
  'js/image-upload.js',   // Image handling and alt-text generation
  'js/comment-moderation.js', // AI comment analysis
  'js/storage.js',        // localStorage management
  'js/ui-helpers.js',     // UI utilities and event handling
  'js/app.js'            // Main application initialization
];

/**
 * Loads a single JavaScript file
 * @param {string} src - Path to the JavaScript file
 * @returns {Promise} - Resolves when the script is loaded
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Loads all modules in sequence to maintain dependency order
 */
async function loadAllModules() {
  console.log('Loading application modules...');
  
  try {
    // Load each module in order
    for (const module of modules) {
      await loadScript(module);
      console.log(`✅ Loaded: ${module}`);
    }
    
    console.log('🎉 All modules loaded successfully!');
  } catch (error) {
    console.error('❌ Failed to load modules:', error);
    // Show user-friendly error message
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>⚠️ Loading Error</h2>
        <p>Failed to load application modules. Please refresh the page.</p>
        <p style="color: #666; font-size: 14px;">Error: ${error.message}</p>
      </div>
    `;
  }
}

// Start loading modules as soon as this script runs
loadAllModules();