# Lily Voice Health Assistant — No API Key Edition

A voice-first educational health-information prototype with an original duck avatar. **No Gemini key, AI subscription, or external API credentials are required.**

## What changed

- Gemini calls and `.env.example` removed; a ready-to-use `.env` is included.
- Questions are looked up through Wikipedia's public MediaWiki API, with a source link. This is a **search-and-summary service, not a generative AI chatbot**. It cannot reliably reason over follow-up questions, personalize medical advice, or answer every health question.
- For doctors and hospitals, Lily provides a Google Maps search link rather than fabricating or ranking providers. No live provider verification or booking.
- Browser Web Speech API handles speech recognition and speech synthesis. Browser/device support and voice availability vary; recognition may use the browser vendor's online service.
- Medical disclaimer is provided in `DISCLAIMER.md` and on the app screen.

## Run locally

1. Install Node.js **22 or newer**.
2. Extract this ZIP and open a terminal in `lily-voice-health-assistant`.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000` in Chrome or Edge, allow microphone permission, and click the microphone.

The included `.env` contains only `PORT=3000` and `NODE_ENV=production`. **Do not add any Gemini key.** No API credentials are needed. Internet access is required to retrieve Wikipedia articles and open provider-search links.

## Deploy to Vercel

This is a Node/Express application. `vercel.json` routes traffic to `server.js`; the server exports the Express app for serverless execution. Import the project into Vercel, use the project root as the Root Directory, and deploy with the Node.js runtime. You do not need to configure any secret or Gemini environment variable. Vercel supplies its own runtime port; the included `.env` is primarily for local use. Check your deployment logs if the hosting platform changes its runtime requirements.

## Privacy and safety

Speech recognition may be processed by your browser vendor. Recognized questions are sent to your backend and to Wikipedia for article lookup. The backend does not intentionally store transcripts; the browser keeps the session transcript in memory until you reset or close it, with optional local download. Avoid sharing sensitive health information. This is **not a medical device or emergency service**. See `DISCLAIMER.md`.

## Quick tests

- `GET /api/health` should return `ok: true`.
- Ask “What is diabetes?” for a short sourced overview.
- Ask “Hospitals in my city” to receive an external provider-search link (not verified listings).
- Ask “I have chest pain” to receive emergency guidance.
- Download the transcript, reset, and try again.

## Known limitations

Public Wikipedia content is not a substitute for medical sources such as WHO, NHS, CDC, or a clinician. The free public endpoint can be unavailable or rate-limited. This version does not perform comprehensive medical fact-checking, live web research, clinical decision support, or true conversational AI. Location coordinates are not used for live proximity searches; enter a city for more useful directory links. Browser speech input needs browser permission and usually HTTPS in production.
