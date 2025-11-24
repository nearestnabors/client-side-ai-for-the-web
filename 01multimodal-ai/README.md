# Constructive Comment Form Demo

A demonstration of the Chrome Prompt API (Gemini Nano) being used to analyze comment submissions for mean-spirited or bad-faith argumentation, and suggest constructive alternatives.

## Features

- ✅ Real-time analysis of comment tone and argumentation quality
- ✅ Blocks submission of problematic comments
- ✅ Provides AI-generated constructive alternatives
- ✅ Uses Chrome's built-in Gemini Nano model (runs entirely client-side)
- ✅ No server or API keys required

## Requirements

### Browser

- Chrome 138+ (or Chromium-based browser with Prompt API support)

### Hardware Requirements

- **Operating System**: Windows 10/11, macOS 13+ (Ventura), Linux, or ChromeOS (Platform 16389.0.0+ on Chromebook Plus)
- **Storage**: At least 22 GB free space on the Chrome profile volume
- **GPU**: 4+ GB VRAM, OR
- **CPU**: 16+ GB RAM with 4+ CPU cores
- **Network**: Unlimited/unmetered connection (for initial model download)

## Setup

### 1. Register for Origin Trial (Required)

The Chrome Prompt API is currently in an origin trial. You need to:

1. Visit the [Prompt API Origin Trial page](https://developer.chrome.com/origintrials/#/view_trial/2533837740349325313)
2. Register for the trial and get your origin trial token
3. Replace `YOUR_ORIGIN_TRIAL_TOKEN_HERE` in `index.html` (line 9) with your token:
   ```html
   <meta http-equiv="origin-trial" content="YOUR_ACTUAL_TOKEN_HERE" />
   ```

### 2. Serve the Page

The API requires a secure context. Serve the HTML file over HTTP/HTTPS:

```bash
# Using Python 3
python3 -m http.server 8000

# Or using Node.js http-server
npx serve .

# Then open http://localhost:8000
```

## How to Use

1. Open the served page in Chrome 138+
2. The page will check if the Prompt API is available
3. Type a comment in the text area
4. Click "Submit Comment"
5. The AI will analyze your comment:
   - If constructive and respectful → ✅ Ready to submit
   - If mean or bad-faith → ⚠️ Blocked with a suggested alternative

## How It Works

The demo uses the Chrome Prompt API's structured output feature with a JSON schema to:

1. Analyze the comment for problematic language (personal attacks, hostility, bad-faith arguments)
2. Determine if it's constructive or problematic
3. Generate a respectful, objective alternative if needed
4. Block submission and display the suggestion

## Examples

Try these comments to see the AI in action:

**Problematic:**

- "This is the dumbest idea I've ever heard. You're clearly an idiot."
- "You don't know what you're talking about. Go away."

**Constructive alternatives will be suggested that maintain the core concern but express it respectfully.**

## Technical Details

- Uses `LanguageModel.create()` to initialize a Gemini Nano session
- Leverages `responseConstraint` with JSON Schema for structured output
- Session is created on first user interaction (required by the API)
- All processing happens locally in your browser

## Notes

- The model downloads automatically on first use (requires user activation)
- Check `chrome://on-device-internals` to see model download progress
- The model is removed if storage falls below 10 GB free
- **Browser Extensions**: Some browser extensions (like React DevTools) can interfere with API detection. If you see "API not available" errors, try disabling extensions temporarily.
- This is a prototype/demo - production implementations should add additional validation and error handling

## Learn More

- [Chrome Prompt API Documentation](https://developer.chrome.com/docs/ai/prompt-api)
- [Chrome Built-in AI APIs](https://developer.chrome.com/docs/ai/built-in/)
