import React, { Suspense, useState, useRef, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Leva, useControls } from 'leva' 

import BackgroundSphere from './components/BackgroundSphere'
import BackgroundGradient from './components/BackgroundGradient'
import CameraController from './components/CameraController'
import FlowerCircle from './components/FlowerCircle' 
import AppUI from './components/AppUI'
import SantaCar from './components/SantaCar'
import CarSmoke from './components/CarSmoke'
import AudioSyncManager from './components/AudioSyncManager'
import PoseMotionValueDetector from './components/PoseMotionValueDetector'
import SpeechController from './components/SpeechController'

export default function App() {
  const carRef = useRef()
  const santaRef = useRef()
  
  const [motionValue, setMotionValue] = useState(0)
  const [carHeight, setCarHeight] = useState(-16)
  const [isGameActive, setIsGameActive] = useState(true)

  const { flowerCount, circleRadius, circleHeight, size, random } = useControls('Flower Circle', {
    flowerCount: { value: 180, min: 1, max: 100, step: 1, label: 'Avg Count' },
    circleRadius: { value: 98, min: 10, max: 150, step: 1, label: 'Base Radius' },
    circleHeight: { value: -34, min: -40, max: 40, step: 1, label: 'Height' },
    size: { value: .3, min: 0.1, max: 5.0, step: 0.1, label: 'Base Size' },
    random: { value: 0.2, min: 0.0, max: 2.0, step: 0.1, label: 'Randomness' }
  })

  const randomRings = useMemo(() => {
    return [0, 1, 2, 3, 4].map((ringIndex) => {
      const randomVariation = Math.floor(Math.random() * 20) - 10;
      const randomizedCount = Math.max(5, flowerCount + randomVariation); 

      return {
        id: ringIndex,
        count: randomizedCount,
        height: circleHeight - (ringIndex * 2) 
      }
    })
  }, [flowerCount, circleHeight]) 

  const activeMotion = isGameActive ? motionValue : 0

  const handleVoiceCommand = useCallback((command) => {
    console.log(`🚀 VOICE TRIGGER: Moving SantaCar ${command.toUpperCase()}!`);
    
    setCarHeight(prev => {
      if (command === 'up') return Math.min(prev + 8, 40); 
      if (command === 'down') return Math.max(prev - 8, -40); 
      return prev;
    });
  }, []);

  return (
    <>
      <Leva collapsed={true} />
      
      <AppUI motionValue={activeMotion} isGameActive={isGameActive}/>
      
      <PoseMotionValueDetector
        onMotionValue={({ motionValue }) => {
          if (isGameActive) setMotionValue(motionValue)
        }}
        debug={false} 
      />


      <Canvas>
        <PerspectiveCamera makeDefault fov={75} position={[0, 0, 3]} far={2000} />
        <CameraController speed={0.01} initialAngle={Math.PI / 2} />

        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 10, 5]} intensity={5} />

        <Suspense fallback={null}>
          <BackgroundSphere />
          <BackgroundGradient topColor="#fffae6" bottomColor="#ffd700" />
          
          <SantaCar 
            ref={carRef} 
            radius={85} 
            y={carHeight} 
            scale={1.2} 
            santaScale={2.4} 
            motionValue={activeMotion}
          />

          {/* THE FIX: By placing the flowers INSIDE the AudioSyncManager, it will automatically hand the beat to them! */}
          <AudioSyncManager 
            santaRef={santaRef} 
            motionValue={activeMotion}
            onFirstLoopComplete={() => setIsGameActive(false)}
          >
            {randomRings.map((ring) => (
              <FlowerCircle 
                key={ring.id}
                count={ring.count} 
                radius={circleRadius} 
                height={ring.height} 
                baseScale={size} 
                scaleRandomness={random} 
              />
            ))}
          </AudioSyncManager>

          <CarSmoke carRef={carRef} motionValue={activeMotion} />
        </Suspense>
      </Canvas>
    </>
  )
}