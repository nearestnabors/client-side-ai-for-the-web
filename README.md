# AI-Powered Image Analysis & Comment Moderation

A client-side web application that demonstrates AI-powered image analysis and comment moderation using Google's Gemini AI API. Upload an image, get AI-generated alt text, and experience intelligent comment moderation that considers the image context.

## Features

- **AI Image Analysis**: Upload images and get automatically generated alt text using Gemini 2.5 Flash
- **Context-Aware Comment Moderation**: AI moderates comments with knowledge of what image is being discussed
- **Smart Suggestions**: When comments are flagged, AI provides constructive alternatives
- **Single Image Focus**: Clean, simple interface for one image at a time
- **No Backend Required**: Runs entirely in the browser with direct API calls

## Prerequisites

- A Google AI API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- A local web server (due to CORS restrictions with file:// URLs)

## Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd local-ai
   ```

2. **Serve the application**

   Choose one of these methods:

   **Option A: Python (recommended)**

   ```bash
   python3 -m http.server 3000
   ```

   **Option B: Node.js**

   ```bash
   npx serve . -p 3000
   ```

3. **Open in browser**

   ```
   http://localhost:3000/01multimodal-ai/
   ```

4. **Configure API Key**
   - Enter your Google AI API key in the configuration section
   - The key is stored locally and never sent anywhere except Google's API

## How to Use

1. **Set up API Key**: Enter your Google AI API key on first visit
2. **Upload Image**: Click the upload area or drag & drop an image
3. **Review Alt Text**: AI generates descriptive alt text automatically
4. **Edit if Needed**: Modify the generated alt text as desired
5. **Post Image**: Click "Add alt text & post" to display the image
6. **Add Comments**: Write comments about the image
7. **AI Moderation**: Comments are analyzed for tone and constructiveness, with the AI understanding what image is being discussed

## Project Structure

```
local-ai/
├── 01multimodal-ai/           # Main application
│   ├── index.html             # Application entry point
│   └── js/
│       ├── main.js            # Application initialization
│       └── comment-moderation.js  # Comment AI and moderation
├── common/                    # Shared resources
│   ├── css/
│   │   ├── main.css          # Main stylesheet
│   │   ├── _colors.css       # Design tokens: colors
│   │   └── _fonts.css        # Design tokens: typography
│   └── js/
│       ├── image-processing.js    # Image upload & AI analysis
│       ├── api-key.js        # API key management
│       └── ui-helpers.js     # UI utilities and helpers
└── 00prototype/              # Original proof-of-concept
```

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **AI**: Google Gemini 2.5 Flash API

## API Usage

The application makes direct calls to:

- `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

For both image analysis and comment moderation. Your API key is required and stored locally in the browser.

## Contributing

This is a demonstration/educational project. Feel free to fork and experiment!

## Get in touch

- [My site](https://nearestnabors.com)
- [My blog about AI and the web](https://agenticweb.nearestnabors.com)
