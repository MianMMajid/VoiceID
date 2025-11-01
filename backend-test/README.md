# Backend Test

Simple test interface for the Voice Liveness Onboarder backend.

## Setup

1. **Add API keys to `.env`**:
   ```bash
   OPENAI_API_KEY=sk-your-key
   ELEVENLABS_API_KEY=sk_your-key
   HUGGINGFACE_API_KEY=hf_your-key
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open the test UI**:
   http://localhost:3000/index.html

## What It Does

- Runs the actual backend from `../backend/packages/serverless`
- Provides a web UI to test voice verification
- Uses real AI services:
  - OpenAI Whisper (transcription)
  - ElevenLabs (TTS)
  - Hugging Face DF_Arena 1B (deepfake detection)

## Files

- `simple-server.js` - Thin wrapper that runs the backend
- `index.html` + `app.js` - Test web interface
- `.env` - API keys configuration
- `package.json` - Dependencies

All backend logic is in `../backend/packages/serverless/src/`
