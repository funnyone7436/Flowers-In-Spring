import React, { useRef, useImperativeHandle, forwardRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

const BEAT_COLORS = [
  '#ef0b2e', '#db7988', '#b7293e', '#f22544', '#f224cc', '#7e24f2', 
  '#2427f2', '#24a2f2', '#24d9f2', '#24f24b', '#90f224', '#cef224', 
  '#f2ba24', '#f25d24', '#ff8e47', '#db5518'
]

function StaticColoredFlower({ baseScene, color }) {
  const uniqueScene = useMemo(() => {
    const clone = SkeletonUtils.clone(baseScene)
    
    clone.traverse((child) => {
      if (child.isMesh && child.name.includes('Petal')) {
        if (child.geometry && child.geometry.attributes.color) {
           delete child.geometry.attributes.color;
        }

        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color), 
          emissive: new THREE.Color(color),
          emissiveIntensity: 0.8, 
          roughness: 0.5, 
          metalness: 0.1  
        })
      }
    })
    return clone
  }, [baseScene, color]) 

  return <primitive object={uniqueScene} />
}

const FlowerCar = forwardRef(({ 
  radius = 96, 
  y = -18, 
  tireSpeed = 5, 
  bodyWobble = 0.1,
  bounceAmplitude = 3, 
  bounceFrequency = 5,
  flowerJumpIntensity = 1.5,
  motionValue = 0,
  ...props 
}, ref) => {
  const meshRef = useRef()
  const particlesRef = useRef([])

  const { nodes } = useGLTF('/glb/FlowerOnCar2.glb')
  const { scene: whiteFlowerScene } = useGLTF('/glb/whiteFlower.glb')

  useImperativeHandle(ref, () => meshRef.current)

  // =========================================================
  // 🌸 MASSIVE SINE-WAVE SKY SETTINGS
  // =========================================================
  // THE FIX: Massive pool of flowers so they don't get recycled early!
  const PARTICLE_COUNT = 300; 

  const MIN_SIZE = 0.6; 
  const MAX_SIZE = 1.; 

  const LIFETIME = 10.0;     // Easily lasts 15 seconds in the sky
  const SPAWN_RATE = 0.05;   

  const spawnTimer = useRef(0);
  const currentParticleIdx = useRef(0);
  
  const particleStates = useRef(
    Array(PARTICLE_COUNT).fill().map(() => ({
      active: false, age: 0, x: 0, y: 0, z: 0, baseX: 0, baseY: 0, baseZ: 0, vy: 0, vz: 0
    }))
  );
  // =========================================================

  const trailData = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      id: i,
      baseScale: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE), 
      color: BEAT_COLORS[Math.floor(Math.random() * BEAT_COLORS.length)],
      rotX: (Math.random() - 0.5) * 5, 
      rotY: (Math.random() - 0.5) * 5,
      rotZ: (Math.random() - 0.5) * 5,
      
      // EXPLICIT SINE WAVE SETTINGS
      swaySpeed: 1.0 + Math.random() * 1.5,    // How fast they wave left and right
      swayWidth: 10 + Math.random() * 15,      // THE FIX: Forces the sine wave to be 10 to 25 units wide!
      
      bobSpeed: 1 + Math.random() * 2,         // How fast they bob up and down
      bobHeight: 2 + Math.random() * 3,        // How high they bob
      
      timeOffset: Math.random() * Math.PI * 2, // Keeps them from moving perfectly together
    }))
  }, [])

  useFrame((state, delta) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime()
      
      const cameraAngle = Math.atan2(state.camera.position.x, state.camera.position.z)
      const carAngle = cameraAngle + Math.PI 

      meshRef.current.position.x = radius * Math.sin(carAngle)
      meshRef.current.position.z = radius * Math.cos(carAngle)
      
      const carBounce = Math.sin(t * bounceFrequency) * bounceAmplitude
      meshRef.current.position.y = y + carBounce
      meshRef.current.lookAt(state.camera.position)

      const tireNames = ['carTireB001', 'carTireBB001', 'carTireF001', 'carTireFB001']
      tireNames.forEach((name) => {
        if (nodes[name]) nodes[name].rotation.z = t * tireSpeed
      })
      if (nodes.carBody001) {
        nodes.carBody001.rotation.z = Math.sin(t * 4) * bodyWobble 
      }

      const jumpSync = (Math.sin(t * bounceFrequency) + 1) / 2;

      if (nodes.flowerInCar) {
        const flower = nodes.flowerInCar;
        if (!flower.userData.initialY) {
          flower.userData.initialY = flower.position.y+1; 
          flower.userData.initialScale = flower.scale.clone(); 
        }
        
        flower.position.y = flower.userData.initialY + (jumpSync * flowerJumpIntensity);

        const scaleMultiplier = 1 + (jumpSync * 0.2); 
        flower.scale.set(
          flower.userData.initialScale.x * scaleMultiplier,
          flower.userData.initialScale.y * scaleMultiplier,
          flower.userData.initialScale.z * scaleMultiplier
        );

        flower.rotation.z = Math.sin(t * bounceFrequency) * 0.12; 
        flower.rotation.y = Math.sin(t * bounceFrequency * 0.6) * 0.24; 
      }

      if (nodes.Hair_Ponytail) {
        nodes.Hair_Ponytail.rotation.y = Math.cos(t * bounceFrequency) * 0.4
      }

      // =========================================================
      // 1. SPAWN NEW PARTICLES
      // =========================================================
      spawnTimer.current += delta;
      
      if (spawnTimer.current > SPAWN_RATE) {
        spawnTimer.current = 0;
        
        const idx = currentParticleIdx.current;
        const pState = particleStates.current[idx];
        
        pState.active = true;
        pState.age = 0;
        
        // Base starting positions
        pState.baseX = (Math.random() - 0.5) * 5; 
        pState.baseY = 8 + (jumpSync * 5); 
        pState.baseZ = 5;
        
        // THE FIX: Slower vertical and backward speeds so they stay visible in the sky!
        pState.vy = 1 + Math.random() * 3;  // Slow, gentle drift upwards
        pState.vz = 5 + Math.random() * 5;  // Slow drift backwards

        currentParticleIdx.current = (idx + 1) % PARTICLE_COUNT;
      }

      // =========================================================
      // 2. UPDATE ACTIVE PARTICLES (Perfect Sine Wave Physics)
      // =========================================================
      particlesRef.current.forEach((particle, index) => {
        if (!particle) return;
        
        const pState = particleStates.current[index];
        const data = trailData[index];

        if (pState.active) {
          pState.age += delta;
          
          if (pState.age < LIFETIME) {
            
            // 1. Move the center anchor point back and up
            pState.baseY += pState.vy * delta;
            pState.baseZ += pState.vz * delta;
            
            // 2. TRUE SINE WAVE MATH: 
            // We calculate the exact sine curve based on their age and width
            const windSwayX = Math.sin(pState.age * data.swaySpeed + data.timeOffset) * data.swayWidth;
            const floatBobY = Math.cos(pState.age * data.bobSpeed + data.timeOffset) * data.bobHeight;

            // 3. Apply the sine wave directly to the base position
            pState.x = pState.baseX + windSwayX;
            pState.y = pState.baseY + floatBobY;
            pState.z = pState.baseZ;

            // Apply to the 3D object
            particle.position.set(pState.x, pState.y, pState.z);

            // Handle fading out over the last 20% of their lifetime
            let currentScale = data.baseScale;
            const progress = pState.age / LIFETIME;
            if (progress > 0.8) {
              currentScale = data.baseScale * (1 - ((progress - 0.8) / 0.2)); 
            }
            particle.scale.setScalar(Math.max(0, currentScale));

            // Tumble gently
            particle.rotation.x += data.rotX * delta;
            particle.rotation.y += data.rotY * delta;
            particle.rotation.z += data.rotZ * delta;
            
          } else {
            pState.active = false;
            particle.scale.setScalar(0); 
          }
        }
      });
    }
  })

  return (
    <group ref={meshRef} dispose={null}>
      <group rotation={[0, Math.PI, 0]}>
        
        <primitive 
          object={nodes.Scene || nodes[Object.keys(nodes)[0]]} 
          scale={props.scale || 0.6} 
        />

        {trailData.map((data, index) => (
          <group key={data.id} ref={(el) => particlesRef.current[index] = el} scale={0}>
             <StaticColoredFlower baseScene={whiteFlowerScene} color={data.color} />
          </group>
        ))}

      </group>
    </group>
  )
})

useGLTF.preload('/glb/FlowerOnCar2.glb')
useGLTF.preload('/glb/whiteFlower.glb')

export default FlowerCar