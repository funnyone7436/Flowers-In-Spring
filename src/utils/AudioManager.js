// src/utils/AudioManager.js
let audio = null
let beats = []

export async function loadAudioAndBeats() {
  if (!audio) {
    // THE FIX: These are now wrapped in backticks (`) instead of single quotes (')!
    audio = new Audio(`${import.meta.env.BASE_URL}r3f/music/Countdown.mp3`)
    await fetch(`${import.meta.env.BASE_URL}r3f/music/Countdown_final.json`)
      .then(res => res.json())
      .then(data => {
        beats = data.beats
      })
  }
  return { audio, beats }
}

export function getAudio() {
  return audio
}

export function getBeats() {
  return beats
}