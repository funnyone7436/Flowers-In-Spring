import { useEffect, useRef } from 'react'
import * as tf from '@tensorflow/tfjs'
import * as speechCommands from '@tensorflow-models/speech-commands'

export default function SpeechController({ onCommandDetected }) {
  const recognizerRef = useRef(null)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    async function setupSpeechAI() {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        console.log("⏳ Loading AI Analysis Model...");
        
        // Using the standard browser-based model to avoid 'SyntaxError' fetch issues
        const recognizer = speechCommands.create('BROWSER_FFT');
        await recognizer.ensureModelLoaded();
        recognizerRef.current = recognizer;

        console.log("🎤 AI Brain Active. Labels:", recognizer.wordLabels());

// src/components/SpeechController.jsx

// Inside your SpeechController.jsx listen block

recognizer.listen(result => {
  const scores = Array.from(result.scores);
  const labels = recognizer.wordLabels();
  const index = scores.indexOf(Math.max(...scores));
  const word = labels[index];
  const score = scores[index];

  // 1. LOG: See everything the AI thinks it hears
  if (score > 0.40) {
    console.log(`👂 AI Brain: ${word} (${(score * 100).toFixed(0)}%)`);
  }

  // 2. BIAS CORRECTION: Raising the bar for 'Up'
  // We require 'Up' to be near-perfect AND not just background noise
  const isStrictUp = word === "up" && score > 0.995; 
  
  // We allow 'Down' to trigger more easily (80% confidence)
  const isLenientDown = word === "down" && score > 0.80;

  if (isStrictUp || isLenientDown) {
    console.log(`✅ VERIFIED: Moving ${word.toUpperCase()}`);
    onCommandDetected(word);
  }
}, {
  probabilityThreshold: 0.75, // Ignore quiet background chatter
  overlapFactor: 0.80,        // Stay snappy for real-time feel
  invokeCallbackOnNoiseAndUnknown: false
})
      } catch (err) {
        console.error("❌ AI Analysis Error:", err);
        isLoadingRef.current = false;
      }
    }

    setupSpeechAI();

    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stopListening();
        recognizerRef.current = null;
        isLoadingRef.current = false;
      }
    };
  }, [onCommandDetected])

  return null
}