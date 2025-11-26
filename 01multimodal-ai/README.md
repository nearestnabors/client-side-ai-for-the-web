# AI-Powered Image Analysis & Comment Moderation

A demonstration of using Google's Gemini AI for multimodal tasks: analyzing images to generate accessible alt-text and moderating comments for constructive conversation.

## ✨ Features

- **🖼️ Image Analysis**: Upload images and get AI-generated alt-text descriptions
- **💬 Comment Moderation**: Real-time analysis of comment tone and content
- **🔄 Regeneration**: Re-analyze images for different alt-text perspectives
- **💾 Local Storage**: Images and comments are saved locally (no server required)
- **🛡️ Content Safety**: Blocks problematic comments with constructive suggestions
- **📱 Responsive Design**: Works great on desktop and mobile

## 🚀 Quick Start

### 1. Get Your Google AI API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" and copy the generated key

### 2. Set Up the Application

1. **Clone or download** this repository
2. **Serve the files** over HTTP/HTTPS (required for file uploads):
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   
   # Then open http://localhost:8000
   ```

### 3. Configure Your API Key

1. Open the application in your browser
2. Enter your Google AI API key in the configuration section
3. Click "Save Key" - it will be stored securely in your browser's local storage

## 🎯 How to Use

### Image Analysis

1. **Upload an Image**:
   - Click the upload area or drag and drop an image
   - Supports common formats: JPG, PNG, GIF, WebP
   - Maximum file size: 10MB

2. **Get AI-Generated Alt Text**:
   - Gemini AI automatically analyzes your image
   - Receives a detailed, accessible description
   - Click "🔄 Regenerate" for alternative descriptions

3. **View Results**:
   - Alt-text appears below the image
   - Copy the text for use in your websites or documents

### Comment Moderation

1. **Write a Comment**:
   - Type your thoughts in the comment box
   - Comments can be about the uploaded image or general discussion

2. **AI Analysis**:
   - Each comment is analyzed for tone and constructiveness
   - ✅ **Constructive comments** are posted immediately
   - ⚠️ **Problematic comments** are blocked with suggestions

3. **View Comments**:
   - All approved comments appear in the comments section
   - Comments are saved locally and persist between sessions

## 🧠 How It Works

### Image Analysis
- Uses **Gemini 1.5 Flash** for fast, accurate image understanding
- Generates detailed alt-text focusing on accessibility
- Considers visual elements, colors, text, and context
- Optimized prompts for web accessibility standards

### Comment Moderation
- Analyzes comments for problematic content including:
  - Personal attacks or insults
  - Hostile or aggressive tone
  - Discriminatory language
  - Bad-faith arguments
- Provides constructive alternatives for blocked comments
- Allows genuine criticism and polite disagreements

### Local Storage
- **Images**: Stores up to 10 recent images with their alt-text
- **Comments**: Saves all approved comments locally
- **API Key**: Securely stored in browser's localStorage
- **No Server Required**: Everything runs in your browser

## 🔧 Technical Details

### API Integration
- **Google Generative AI REST API** via fetch requests
- **Gemini 1.5 Flash** model for optimal speed/quality balance
- Structured JSON responses for reliable parsing
- Error handling and user-friendly messages

### Security & Privacy
- API key stored locally in your browser only
- Images processed by Google AI but not stored by Google
- No external servers or databases required
- All user data stays in browser localStorage

### Browser Compatibility
- **Modern browsers** supporting ES6+ features
- **File API** for image uploads
- **localStorage** for data persistence
- **Fetch API** for HTTP requests

## 📚 Use Cases

### For Web Developers
- **Accessibility**: Generate alt-text for images at scale
- **Content Moderation**: Implement AI-powered comment filtering
- **Prototyping**: Quick multimodal AI integration examples

### For Content Creators
- **Alt-Text Generation**: Make your content more accessible
- **Community Management**: Maintain positive discussion environments
- **Workflow Enhancement**: Streamline content preparation

### For Educators
- **AI Literacy**: Demonstrate practical AI applications
- **Web Accessibility**: Teach the importance of alt-text
- **Ethics**: Discuss AI moderation and bias considerations

## ⚙️ Configuration

### API Rate Limits
Google AI Studio provides generous free tier limits:
- **15 requests per minute**
- **1,500 requests per day**
- **1 million tokens per day**

For production use, consider upgrading to Google AI Pro.

### Customization
You can modify the prompts in `script.js`:
- **Image analysis prompt** (line ~168): Adjust for different alt-text styles
- **Comment moderation prompt** (line ~284): Change moderation criteria

### Storage Limits
- **Images**: Limited to 10 recent uploads (localStorage constraint)
- **Comments**: No practical limit for typical use
- **Total Storage**: ~5-10MB depending on browser

## 🛠️ Development

### Project Structure
```
01multimodal-ai/
├── index.html          # Main HTML structure
├── style.css           # Responsive CSS styling
├── script.js           # Core JavaScript functionality
├── README.md           # This documentation
└── [sample images]     # Example images for testing
```

### Key Functions
- `generateAltText()`: Handles image analysis via Gemini API
- `analyzeComment()`: Moderates comments using AI
- `saveImageToStorage()`: Manages local image storage
- `updateUIState()`: Manages app state and UI updates

## 🚨 Important Notes

### API Key Security
- Never commit API keys to version control
- API keys are stored locally and not transmitted except to Google
- Consider using environment variables for production deployments

### Content Policy
- This tool implements basic moderation guidelines
- Review Google's [AI usage policies](https://ai.google.dev/gemini-api/docs/safety-guidance)
- Consider additional moderation layers for production use

### Limitations
- Requires active internet connection
- Subject to Google AI API availability and limits
- Image analysis quality depends on image clarity and content

## 📖 Learn More

- [Google AI for Developers](https://ai.google.dev/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Content Moderation Best Practices](https://www.perspectiveapi.com/)

## 📄 License

This project is a demonstration/educational tool. Feel free to adapt and modify for your needs.

---

**Built with ❤️ for the web.dev community**