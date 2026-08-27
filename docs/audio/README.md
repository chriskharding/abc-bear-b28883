# Recorded audio

Clips exported from the in-app recorder (`/?record` → "export all as files") go
here, named exactly as they are exported — `phoneme_s.wav`, `word_cat.wav`,
`sfx_roar_1.wav`, and so on. The app looks them up by that filename.

Why this folder exists: the recorder stores takes in the browser's IndexedDB,
which is per-browser and per-machine. A recording made on the laptop is not
visible to Safari on a phone. Exporting the files here, and committing them,
is what makes the audio ship with the app.

Load order for any clip:

1. a local recording in IndexedDB (whatever is being worked on right now)
2. a file in this folder
3. the speech synthesiser, as a last resort

So a half-finished bank still plays, and replacing a file here silently
upgrades the app.
