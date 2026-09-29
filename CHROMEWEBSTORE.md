# Chrome Web Store Metadata & Publishing Guide

**Extension Name**: OmniTheme & Gemini AI Assistant  
**Version**: 1.0.0  
**Category**: Productivity / Customization  
**Last Updated**: 2026-07-24  

---

## Single-Sentence Summary
Customize background themes across all websites with your uploaded pictures and use Gemini AI in a side panel to analyze exam questions and auto-select correct answers.

## Detailed Store Description
Transform your browsing experience with **OmniTheme & Gemini AI Assistant**!

### Key Features:
1. **Global Background Customizer**:
   - Upload any image to replace the plain background across all internet websites.
   - Fine-tune opacity, background blur, brightness, contrast, fit modes (`cover`, `contain`, `repeat`), and blend modes in real-time.
   - Toggle individual website theme settings smoothly without breaking page structure.

2. **Gemini AI Exam & Q&A Assistant**:
   - Side panel assistant powered by Google's latest Gemini AI models (`gemini-2.5-flash`).
   - Automatically scans active web page content and detects multiple-choice quiz questions and options.
   - Recommends the correct answer with detailed explanations.
   - **Auto-Tick Option**: Automatically highlights and checks/ticks the matching correct option (`<input type="radio">`, `<label>`, checkbox, or custom choice element) directly on your exam page with visual ring animations!

---

## Permissions Justification

| Permission | Purpose & Plain-English Justification |
|------------|-----------------------------------------|
| `storage` | Required to save user API key, custom uploaded background image data, and theme preferences locally on the user's device. |
| `tabs` | Required to detect active tab context, title, and send background update notifications to content scripts. |
| `scripting` | Required to inject theme overlay styles and DOM scanner handlers into active web pages. |
| `sidePanel` | Required to display the side panel assistant alongside the user's current browsing tab. |
| `<all_urls>` | Required so the custom background theme and option ticking functionality can operate across any website the user visits. |

---

## Privacy & Data Use Disclosures
- **Single Purpose**: Customize website themes and assist with webpage question answering.
- **Data Collection**: No personal user data is collected or transmitted to third-party tracking servers.
- **API Key Storage**: Gemini API keys and uploaded background images are stored locally in the browser via `chrome.storage.local`.
- **Remote Code**: No remote code is executed. All scripts are bundled within the extension package according to Manifest V3 requirements.

---

## Version History
- **v1.0.0** (Initial Release): Initial release featuring Global Theme Customization and Gemini AI Exam Auto-Tick Side Panel.
