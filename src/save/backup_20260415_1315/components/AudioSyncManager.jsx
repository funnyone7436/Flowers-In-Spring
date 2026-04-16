import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
//import DancingCircles from './DancingCircles'
import BackgroundSync from './BackgroundSync'

export default function AudioSyncManager({ children, motionValue = 0, onFirstLoopComplete }) {
  const audio = useMemo(() => new Audio('/r3f/music/Countdown.mp3'), [])
  const [songData, setSongData] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)
  const currentFrameRef = useRef(null)
  
  // Logic to track the "End of Song"
  const lastTimeRef = useRef(0)
  const loopSignaledRef = useRef(false)

  useEffect(() => {
    fetch('/r3f/music/Countdown_final.json')
      .then(res => res.json())
      .then(data => setSongData(data))
      .catch(err => console.error("❌ JSON Error:", err))

    audio.loop = true
    return () => audio.pause()
  }, [audio])

  useEffect(() => {
    if (!hasStarted && motionValue > 0.1) {
      audio.play().then(() => setHasStarted(true)).catch(() => {})
    }
  }, [motionValue, hasStarted, audio])

  useFrame(() => {
    if (!songData || !audio) return

    const currentTime = audio.currentTime

    // LOOP DETECTION: If time "jumps" back to 0, the song finished once
    if (!loopSignaledRef.current && currentTime < lastTimeRef.current && lastTimeRef.current > 0) {
      loopSignaledRef.current = true
      if (onFirstLoopComplete) onFirstLoopComplete()
      console.log("🏁 Song finished! Motion scoring disabled.")
    }
    lastTimeRef.current = currentTime

    let frame = null
    for (let i = 0; i < songData.length; i++) {
      if (songData[i].t >= currentTime) {
        frame = songData[i]
        break
      }
    }
    currentFrameRef.current = frame
  })

  return (
    <group>
      <BackgroundSync currentFrameRef={currentFrameRef} />
      {React.Children.map(children, child => 
        React.isValidElement(child) ? React.cloneElement(child, { currentFrameRef }) : child
      )}
    </group>
  )
}