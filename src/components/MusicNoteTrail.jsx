import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

// 🎵 1. YOUR CUSTOM BEAT COLORS
const BEAT_COLORS = [
  '#ef0b2e', '#db7988', '#b7293e', '#f22544', '#f224cc', '#7e24f2', 
  '#2427f2', '#24a2f2', '#24d9f2', '#24f24b', '#90f224', '#cef224', 
  '#f2ba24', '#f25d24', '#ff8e47', '#db5518'
]

const NOTE_FILES = [
  'Eighth_Pair_2heads_1beams.glb',
  'Eighth_Quad_4heads_1beams.glb',
  'Eighth_Triplet_3heads_1beams.glb',
  'MusicNote_1heads_0beams.glb',
  'MusicNote_2heads_1beams.glb',
  'MusicNote_2heads_2beams.glb',
  'MusicNote_4heads_2beams.glb',
  'Sixteenth_Pair_2heads_2beams.glb',
  'Sixteenth_Quad_4heads_2beams.glb',
  'Sixteenth_Triplet_3heads_2beams.glb'
]

// 🚀 SIZE MULTIPLIER
const GLOBAL_NOTE_SCALE = 2.0 

// ==========================================
// INDIVIDUAL NOTE COMPONENT
// ==========================================
function NoteParticle({ baseScene, particleData, radius, baseY, lifeTime, spiralStep }) {
  const noteRef = useRef()

  const clonedScene = useMemo(() => {
    if (!baseScene) return null
    const clone = SkeletonUtils.clone(baseScene)
    
    // 🎨 RANDOMLY ASSIGN ONE OF YOUR BEAT COLORS
    const randomHex = BEAT_COLORS[Math.floor(Math.random() * BEAT_COLORS.length)]
    const noteColor = new THREE.Color(randomHex)

    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: noteColor,
          emissive: noteColor,
          emissiveIntensity: 0.8,
          roughness: 0.2
        })
      }
    })
    return clone
  }, [baseScene])

  useFrame((state) => {
    if (!noteRef.current || !particleData.active) {
      if (noteRef.current) noteRef.current.scale.setScalar(0)
      return
    }

    // EXACT CAR CIRCLE MATH
    const cameraAngle = Math.atan2(state.camera.position.x, state.camera.position.z)
    const carAngle = cameraAngle + Math.PI

    // Subtract the note's offset so it trails behind the car perfectly on the big circle
    const myAngle = carAngle - particleData.offset

    noteRef.current.position.x = radius * Math.sin(myAngle)
    noteRef.current.position.z = radius * Math.cos(myAngle)

    const t = state.clock.getElapsedTime()
    const bounce = Math.sin(t * 5 - (particleData.offset * 2)) * 3
    
    // 🌟 THE FIX: SPIRAL & RANDOM HEIGHT MATH 🌟
    // 1. (particleData.offset * spiralStep) makes them rise steadily into a spiral
    // 2. particleData.randomY adds the chaotic vertical difference between neighbors
    noteRef.current.position.y = baseY + bounce + 4.0 + (particleData.offset * spiralStep) + particleData.randomY

    // Face the camera exactly like the car does
    noteRef.current.lookAt(state.camera.position)

    // Dynamic Scale Pop-in and Fade-out
    let currentScale = particleData.scaleBase * GLOBAL_NOTE_SCALE
    const progress = particleData.age / lifeTime
    
    if (progress < 0.05) {
      currentScale *= (progress / 0.05) 
    } else if (progress > 0.8) {
      currentScale *= (1 - (progress - 0.8) / 0.2) 
    }

    noteRef.current.scale.setScalar(currentScale)
  })

  if (!clonedScene) return null

  return <primitive ref={noteRef} object={clonedScene} scale={0} />
}

// ==========================================
// MAIN TRAIL SYSTEM
// ==========================================
export default function MusicNoteTrail({ 
  radius = 85, 
  y = -16, 
  spawnRate = 0.3, 
  lifeTime = 48.0,
  spiralStep = 4.6,        // ⬅️ ADJUST THIS: How steep the spiral climbs into the sky
  heightRandomness = .6    // ⬅️ ADJUST THIS: How much random height difference between neighbors
}) {
  
  const notePaths = useMemo(() => {
    return NOTE_FILES.map(file => `${import.meta.env.BASE_URL}glb/notes/${file}`)
  }, [])

  const noteGltfs = useGLTF(notePaths)

  const MAX_NOTES = Math.ceil(lifeTime / spawnRate) + 5
  const spawnTimer = useRef(0)
  const currentIndex = useRef(0)

  const particles = useMemo(() => {
    return Array.from({ length: MAX_NOTES }).map((_, i) => ({
      id: i,
      active: false,
      age: 0,
      offset: 0,
      noteTypeIndex: 0, 
      scaleBase: Math.random() * 0.4 + 0.6,
      randomY: 0 // Will hold the unique random height for this particle
    }))
  }, [MAX_NOTES])

  useFrame((state, delta) => {
    spawnTimer.current += delta
    
    // 1. Spawner Logic (Fires every 0.2 seconds)
    if (spawnTimer.current >= spawnRate) {
      spawnTimer.current = 0

      const p = particles[currentIndex.current]
      p.active = true
      p.age = 0
      p.offset = 0.15 
      p.noteTypeIndex = Math.floor(Math.random() * NOTE_FILES.length)
      
      // Assign a permanent random height offset when the particle is born
      p.randomY = (Math.random() - 0.5) * heightRandomness

      currentIndex.current = (currentIndex.current + 1) % MAX_NOTES
    }

    // 2. Convoy Logic
    particles.forEach(p => {
      if (p.active) {
        p.age += delta
        // Fall further behind the car smoothly over time
        p.offset += delta * 0.4 
        if (p.age > lifeTime) p.active = false
      }
    })
  })

  return (
    <group>
      {particles.map((data) => {
        const assignedScene = noteGltfs[data.noteTypeIndex]?.scene
        return (
          <NoteParticle 
            key={data.id} 
            baseScene={assignedScene} 
            particleData={data} 
            radius={radius}
            baseY={y}
            lifeTime={lifeTime} 
            spiralStep={spiralStep}
          />
        )
      })}
    </group>
  )
}

NOTE_FILES.forEach(file => {
  useGLTF.preload(`${import.meta.env.BASE_URL}glb/notes/${file}`)
})