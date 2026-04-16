import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useControls } from 'leva'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'

// Your custom 16 color codes!
const BEAT_COLORS = [
  '#ef0b2e', '#db7988', '#b7293e', '#f22544', '#f224cc', '#7e24f2', 
  '#2427f2', '#24a2f2', '#24d9f2', '#24f24b', '#90f224', '#cef224', 
  '#f2ba24', '#f25d24', '#ff8e47', '#db5518'
]

// --- BEAT SYNCED FLOWER (DEBUG VERSION) ---
function ColorfulFlower({ baseScene, scale, glow, currentFrameRef }) {
  const materialRefs = useRef([])
  const baseIndex = useRef(0) 
  const shiftOffset = useRef(0)
  const canChangeColor = useRef(true)

  const uniqueScene = useMemo(() => {
    const clone = SkeletonUtils.clone(baseScene)
    materialRefs.current = []
    
    const flowerRandomIdx = Math.floor(Math.random() * BEAT_COLORS.length)
    baseIndex.current = flowerRandomIdx 

    clone.traverse((child) => {
      if (child.isMesh && child.name.includes('Petal')) {
        if (child.geometry && child.geometry.attributes.color) {
           delete child.geometry.attributes.color;
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(BEAT_COLORS[flowerRandomIdx]), 
          emissive: new THREE.Color(BEAT_COLORS[flowerRandomIdx]),
          emissiveIntensity: glow, 
          roughness: 0.5, 
          metalness: 0.1  
        })
        
        child.material = mat
        materialRefs.current.push(mat)
      }
    })
    return clone
  }, [baseScene, glow]) 

  // --- THE MUSIC SYNC LOGIC ---
  useFrame(() => {
    // BUG CHECK #1: Is the ref plugged in?
    if (!currentFrameRef || !currentFrameRef.current) {
      // If this is flooding your console, App.jsx is not handing the ref to the flowers!
      // console.log("❌ Flowers are missing the currentFrameRef!"); 
      return;
    }

    const frame = currentFrameRef.current
    const beat = frame.audio?.beat || 0

    // Trigger when the beat hits
    if (beat >= 0.4) {
      if (canChangeColor.current) {
        shiftOffset.current += 1 
        canChangeColor.current = false 

        const nextIdx = (baseIndex.current + shiftOffset.current) % BEAT_COLORS.length
        const nextColor = BEAT_COLORS[nextIdx]

        // BUG CHECK #2: Prove the beat is hitting!
        console.log(`🎵 BEAT HIT! Changing flower to: ${nextColor}`);

        // Update all the petals
        materialRefs.current.forEach((mat) => {
          mat.color.set(nextColor)
          mat.emissive.set(nextColor)
          mat.needsUpdate = true // Forces ThreeJS to refresh the material
        })
      }
    } 
    
    if (beat < 0.4) {
      canChangeColor.current = true
    }
  })

  return <primitive object={uniqueScene} scale={scale} />
}


// --- MAIN CIRCLE COMPONENT ---
export default function FlowerCircle({ 
  count = 10, 
  radius = 85, 
  height = -10,
  baseScale = 1.0,        
  scaleRandomness = 0.4,
  glow = 0.8,
  currentFrameRef 
}) {
  const { scene } = useGLTF('/glb/whiteFlower.glb')
  
  const { tiltX, tiltY, tiltZ } = useControls('Flower Rotation Fix', {
    tiltX: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
    tiltY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 },
    tiltZ: { value: 0, min: -Math.PI, max: Math.PI, step: 0.1 }
  })

  // Calculate random sizes for each flower once
  const randomScales = useMemo(() => {
    return Array.from({ length: count }).map(() => {
      const variation = (Math.random() * 2 - 1) * scaleRandomness;
      return Math.max(0.1, baseScale + variation); 
    })
  }, [count, baseScale, scaleRandomness])

  const flowers = Array.from({ length: count })

  return (
    <group position={[0, height, 0]}>
      {flowers.map((_, index) => {
        const angle = (index / count) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius

        return (
          <group 
            key={index} 
            position={[x, 0, z]} 
            rotation={[0, -angle - Math.PI / 2, 0]} 
          >
            <group rotation={[tiltX, tiltY, tiltZ]}>
              <ColorfulFlower 
                baseScene={scene} 
                scale={randomScales[index]} 
                glow={glow} 
                currentFrameRef={currentFrameRef} 
              />
            </group>
          </group>
        )
      })}
    </group>
  )
}

useGLTF.preload('/glb/whiteFlower.glb')