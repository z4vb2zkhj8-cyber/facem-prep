# FACEM Prep conversational AI OSCE update

Upload the contents of this ZIP to the root of the existing GitHub repository. Preserve the `api/` folder. Commit to `main` to deploy via Vercel.

This patch replaces `osce.js` and `sw.js`, and adds `api/osce-patient.js`. The existing `api/transcribe.js`, `osce.html`, `osce-stations.js`, styles, MCQs and Boss Battles remain unchanged.

The existing Vercel `OPENAI_API_KEY` (Production) powers both speech-to-text and AI patient dialogue. No new environment variable is needed.

**Privacy:** Candidate text and conversation history are sent to OpenAI through the Vercel server endpoint. Candidate audio clips are sent to OpenAI for transcription; the full-station recording remains local to the browser. Do not enter real patient-identifiable information.

**Limitations:** Browser text-to-speech may vary on iOS. AI responses may contain errors. Scripted mode remains available by unchecking the AI patient option before the station. This is an educational simulation, not an official ACEM assessment.

**Security:** A simple per-instance rate limit and same-origin check are included, but the endpoint is still publicly callable. Before opening to a wider trainee group, add login/authentication, persistent rate limiting, spend caps and monitoring.

**Test:** Open https://facem-prep.vercel.app/osce.html, select Conversational AI patient, complete the reading timer, tap Speak, speak and Finish speaking. Sami should reply based on the exact words spoken. Check that typing also works.
