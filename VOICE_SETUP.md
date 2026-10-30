# OSCE voice on iPhone — configuration

The original browser-only speech recognition was unreliable on iOS. This version records each candidate speech turn and sends it to a Vercel serverless transcription endpoint (`/api/transcribe`). The candidate taps **Tap to speak**, speaks, and taps **Finish speaking**; the transcribed text is automatically submitted to Sami. Full-station candidate audio is recorded separately and can be downloaded at the end.

## Required

1. Upload all files from this ZIP, including the `api/` folder, to the root of the GitHub repository (preserve the `api/transcribe.js` path).
2. In Vercel project Settings → Environment Variables, add `OPENAI_API_KEY` as a **server-side secret** (Production). Never add the API key to `facem-config.js` or any public file.
3. Redeploy the project after saving the variable. The transcription API uses OpenAI `gpt-4o-mini-transcribe`, which incurs usage charges.
4. On iPhone, open the site in Safari over HTTPS, allow microphone access, start the station, tap to speak, then tap finish. Do a short test and check that Sami responds. Browser-generated Sami voice depends on iOS speech synthesis.

**Important limitations:** Sami still uses scripted responses rather than a generative AI patient. Candidate recordings stay on the local device unless downloaded/shared; the spoken clips are transmitted to OpenAI for transcription. The app does not yet store recordings for FACEM review. The app requires a network connection for transcription, and typing remains a fallback. Do not speak real patient information. Obtain candidate consent before audio capture. For production, add authenticated access, abuse prevention/rate limits, cost controls, retention/privacy policy and an end-to-end iOS test.
