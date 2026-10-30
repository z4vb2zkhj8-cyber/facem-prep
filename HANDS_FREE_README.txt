FACEM Prep — hands-free Sami OSCE (experimental iPhone Safari build)

Upload osce.js to the ROOT of the GitHub repository, replacing the existing osce.js.
No API changes are required. Existing /api/transcribe, /api/osce-patient and /api/osce-voice are reused.

How it works:
- Enable Hands-free conversation before the station.
- The Start reading time and Begin station taps initialise audio playback.
- During the station the mic uses a local audio-level detector to start and stop short recordings on speech/silence.
- Recordings are sent to the existing transcription endpoint; recognised speech goes to Sami automatically.
- Sami's generated speech uses the existing audio element, then hands-free listening resumes.
- Manual speech and text remain available.

IMPORTANT LIMITATIONS:
- Safari can still restrict automatic playback despite an initial gesture; tap Play Sami's voice once if prompted.
- Audio-level detection can trigger on noise or miss quiet speech; headphones and a quiet room help.
- Voice activity detection starts the recorder at the first sound and may clip the first syllable.
- Requires microphone permission and an open foreground Safari tab. Not tested on an actual iPhone.
- Public AI endpoints need authenticated access and durable rate limits before broad rollout.
