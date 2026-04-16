import React, { useEffect, useState, useRef } from 'react'
import { loadAudioAndBeats, getAudio } from '../utils/AudioManager'

const SCORE_MULTIPLIER = 0.2
const GAME_LOOP_FPS = 1; 
const FRAME_DELAY_MS = 1000 / GAME_LOOP_FPS;
const BASE_FONT_SIZE = 16 

function isAudioPlaying(audio) {
  if (!audio) return false
  return !audio.ended
}

export default function AppUI({ motionValue, isGameActive }) {
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const audioStarted = useRef(false)
  const motionValRef = useRef(0) 

  useEffect(() => {
    motionValRef.current = motionValue
  }, [motionValue])

  useEffect(() => {
    const setup = async () => {
      if (typeof loadAudioAndBeats === 'function') {
         await loadAudioAndBeats()
      }
    }
    setup()
  }, [])

  useEffect(() => {
    let timerId = null 
    const audio = getAudio()
	if (audio) {
    // Set volume to 30% to help the SpeechController 'hear' better
    audio.volume = 0.1; 
    console.log("🔊 Background music volume lowered to 30% for better AI detection.");
  }

    const loop = () => {
      if (motionValRef.current > 0 && !audioStarted.current) {
        const activeAudio = getAudio()
        if (activeAudio) {
         // activeAudio.play().catch(e => console.log(e))
          audioStarted.current = true
        }
      }

      if (audioStarted.current && isGameActive) {
        if (motionValRef.current > 0) {
          scoreRef.current += (motionValRef.current * SCORE_MULTIPLIER)
		      const playing = isAudioPlaying(audio)
		      if (playing) {
			      setScore(Math.floor(scoreRef.current))
			    }
        }
      }
      timerId = setTimeout(loop, FRAME_DELAY_MS)
    }

    loop()
    return () => clearTimeout(timerId)
  }, [isGameActive])

  return (
    <>
      {/* Top-left: Score + Game Over */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '12px',
        fontSize: `${BASE_FONT_SIZE}px`, 
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: !isGameActive ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.1)',
        zIndex: 1000
      }}>
        <div style={{ fontWeight: 'bold' }}>Score: {score}</div>
        
        {!isGameActive && (
          <div style={{ 
            color: '#ffd700', // Festive Gold
            fontWeight: '900',
            letterSpacing: '1px',
            textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
            fontSize: '14px'
          }}>
            ✨ FINISHED! ✨
          </div>
        )}
      </div>

	<div style={{
		position: 'absolute',
		bottom: 10,
		left: '50%',
		transform: 'translateX(-50%)',
		backgroundColor: 'rgba(0,0,0,0.6)',
		color: 'white',
		padding: '10px 20px',
		borderRadius: '12px',
		fontSize: '18px',
		fontWeight: 'bold',
		zIndex: 1000,
		// Add these three lines to create the two-line layout:
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		textAlign: 'center',
		lineHeight: '1.4'
	}}>
		<div style={{ fontSize: '18px', opacity: 0.9 }}>Jump for Joy, Bloom for Spring! </div>
	</div>

      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: '6px 10px',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 1000
      }}>
        <div>🔐 No worries, just fun!</div>
        <a href="https://github.com/funnyone7436/Flowers-In-Spring" target="_blank" style={{ color: '#61dafb' }}>🔍 View full source</a>
      </div>
    </>
  )
}