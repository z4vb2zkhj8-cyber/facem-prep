FACEM Prep — OpenAI-generated Sami voice

Upload osce.js to the repository root, and osce-voice.js into the existing api/ folder. Do not upload the folder containing the ZIP itself. Commit to main and wait for Vercel READY. Existing OPENAI_API_KEY is reused.

Sami uses OpenAI speech synthesis, with a visible Play Sami’s voice button if Safari blocks autoplay. Browser speech synthesis is the fallback. Recording and transcription remain unchanged.

Voice generation incurs additional API charges. The endpoint is public and the in-memory request cap is NOT robust across serverless instances; add authenticated access and durable usage limits before opening to trainees. Never put the key in GitHub.

Test on iPhone: begin station, listen for Sami’s opening line; if silent tap Play Sami’s voice. Then record a candidate response and confirm she speaks back. This is untested on physical iPhone.
