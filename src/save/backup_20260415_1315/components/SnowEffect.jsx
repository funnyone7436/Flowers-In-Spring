import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function SnowEffect({ motionValue = 0 }) {
  const meshRef = useRef()
  const smoothedMotion = useRef(0)

  // 1. Move parameters to a local config object
  const config = {
    count: 1000,
    speed: 0.00,
    sizeMax: 0.001,
    color: '#ffffff',
    brightness: 2.0,
    areaRadius: 80,
    areaHeight: 100,
  }

  // Use config values for initialization
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(config.count * 3)
    const vel = new Float32Array(config.count)
    for (let i = 0; i < config.count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * config.areaRadius * 2
      pos[i * 3 + 1] = Math.random() * config.areaHeight - (config.areaHeight / 2)
      pos[i * 3 + 2] = (Math.random() - 0.5) * config.areaRadius * 2
      vel[i] = Math.random() * 0.4 + 0.05 
    }
    return [pos, vel]
  }, [config.count, config.areaRadius, config.areaHeight])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    // --- MOTION MAPPING (Kept exactly as before) ---
    const maxExpectedMotion = 8.0 
    const targetFactor = Math.min(motionValue / maxExpectedMotion, 1.0)
    
    smoothedMotion.current = THREE.MathUtils.lerp(smoothedMotion.current, targetFactor, 0.15)
    const sm = smoothedMotion.current

    // Use config base values + motion factor
    const dynamicSpeed = config.speed + (sm * 6.0)
    const dynamicSize = config.sizeMax + (sm * 0.6)

    meshRef.current.material.size = dynamicSize

    const attr = meshRef.current.geometry.attributes.position
    for (let i = 0; i < config.count; i++) {
      attr.array[i * 3 + 1] -= velocities[i] * dynamicSpeed
      
      if (attr.array[i * 3 + 1] < -config.areaHeight / 2) {
        attr.array[i * 3 + 1] = config.areaHeight / 2
      }
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={config.count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={config.sizeMax}
        color={new THREE.Color(config.color).multiplyScalar(config.brightness)}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
        map={new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/snowflake1.png')}
      />
    </points>
  )
}