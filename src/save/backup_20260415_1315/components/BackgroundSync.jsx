import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef, useState, useEffect } from 'react'

export default function BackgroundSync({ currentFrameRef }) {
  const { scene } = useThree()
  
/* const colors = [
    "#b37474", // Dusty Rose / Muted Pink
    "#602323", // Dark Maroon / Brick Red
    "#615423", // Dark Olive / Brownish-Green
    "#b3a674", // Khaki / Muted Gold
    "#779b68", // Sage Green
    "#396028", // Forest Green
    "#29614a", // Dark Pine / Teal Green
    "#66c59e", // Seafoam / Mint Green
    "#66c0c4", // Light Cyan / Aquamarine
    "#1c5053", // Dark Slate Teal
    "#201d54", // Midnight Blue / Dark Indigo
    "#874dd2", // Vibrant Purple / Violet
    "#9e3f70", // Raspberry / Muted Magenta
    "#741549", // Deep Burgundy / Wine
    "#9b0505"  // Crimson / Deep Red
  ]; */
  const colors = [
  "#b3a674", // Khaki / Muted Gold
  "#ffffff"  // white
  ];

  const [colorIndex, setColorIndex] = useState(0)
  const lerpSpeed = 0.1      
  const canChangeColor = useRef(true)
  const targetColor = useRef(new THREE.Color(colors[0]))

  // 1. INITIALIZATION: Set background to a color so it isn't null
  useEffect(() => {
    if (scene && !scene.background) {
      scene.background = new THREE.Color(colors[0])
    }
  }, [scene])

  useFrame(() => {
    // 2. SAFETY GATE: Don't run if the background or frame is missing
    if (!currentFrameRef?.current || !scene || !scene.background) return

    const frame = currentFrameRef.current
    const beat = frame.audio?.beat || 0

    // BEAT TRIGGER
    if (beat >= 1) {
      if (canChangeColor.current) {
        const nextIndex = (colorIndex + 1) % colors.length
        setColorIndex(nextIndex)
        targetColor.current.set(colors[nextIndex])
        canChangeColor.current = false 
      }
    } 
    
    // RESET GATE
    if (beat < 0.4) {
      canChangeColor.current = true
    }

    // Now safe to lerp
    scene.background.lerp(targetColor.current, lerpSpeed)
  })

  return null
}