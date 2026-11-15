# The Ascent of the Mascot (≈87 s, 16:9)

Open `index.html` and press play (or Space). Everything on screen is drawn in code (Canvas 2D); sound effects and music are synthesized in code (WebAudio).
Narration: 13 clips generated with Fish Audio **drama-3** (narrator "Ethan", mascot = "funny talking monkey" voice). Script with directions: `SCRIPT.md`.

## Audio files
The sandbox this was built in could not download from Fish Audio's file host, so `audio/` is empty. `index.html` first looks for `audio/01.mp3 … 13.mp3`
and otherwise falls back to the permanent Fish Audio URLs, so it plays as long as you are online.
To make it fully offline, run `./get_audio.sh` once (or `sh get_audio.sh`) on a machine with normal internet access.
