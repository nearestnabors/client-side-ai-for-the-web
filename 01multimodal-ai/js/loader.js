/**
 * ES6 Module Loader
 * Loads the main application module which handles all dependencies
 */

/**
 * Loads the main application module
 */
async function loadApp() {
  console.log('Loading ES6 application modules...');
  
  try {
    // Load the main app module which imports all dependencies
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'js/app.js';
    script.onload = () => {
      console.log('🎉 ES6 modules loaded successfully!');
    };
    script.onerror = () => {
      throw new Error('Failed to load app module');
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error('❌ Failed to load app modules:', error);
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

// Start loading the app as soon as this script runs
loadApp();