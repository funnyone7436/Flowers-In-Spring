import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const _obj = new THREE.Object3D()
const _quat = new THREE.Quaternion()
const _vec3 = new THREE.Vector3()
const _offset = new THREE.Vector3(13.5, 2.8, 5) // Your exhaust position parameter

export default function CarSmoke({ carRef, motionValue = 0 }) {
  const meshRef = useRef()
  const count = 8 // Your count parameter
  const lifeTime = 1.2 // Your lifetime parameter

  // Initialize particles with randomized start times for a continuous loop
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      t: Math.random() * lifeTime, 
      vx: (Math.random() - 0.5) * 0.12, 
      vz: (Math.random() - 0.5) * 0.12,
      vy: Math.random() * 0.05 + 0.1,
      pos: new THREE.Vector3().copy(_offset) 
    }))
  }, [count, lifeTime])

  useFrame((state, delta) => {
    if (!meshRef.current || !carRef?.current) return

    // Sync car position
    carRef.current.updateMatrixWorld(true)
    const worldPos = _vec3.setFromMatrixPosition(carRef.current.matrixWorld)
    const worldQuat = _quat.setFromRotationMatrix(carRef.current.matrixWorld)

    // Map motionValue (assumed ~0 to 1) to your requested ranges
    const maxIntensity = 4.0 
	const intensityRatio = Math.min(motionValue / maxIntensity, 1.0)
    const a = 0.2 + (intensityRatio * 3)   // Still reaches 4 at max intensity
	const b = 0.1 + (intensityRatio * 1.5) // Still reaches 1.6 at max intensity

    particles.forEach((p, i) => {
      p.t += delta
      
      // Infinite Repeat Logic: Reset particle when it reaches lifetime
      if (p.t >= lifeTime) {
        p.t = 0
        p.pos.copy(_offset)
        // Add random variance on spawn to prevent perfect overlap
        p.pos.x += (Math.random() - 0.5) * 0.5
        p.pos.z += (Math.random() - 0.5) * 0.5
      } else {
        // Apply vertical movement based on motion (parameter 'b')
        p.pos.x += p.vx
        p.pos.y += (Math.random() * 0.05 + b) 
        p.pos.z += p.vz
      }

      // Calculate global position
      _obj.position.copy(p.pos).applyQuaternion(worldQuat).add(worldPos)
      
      // Apply scale based on age and motion (parameter 'a')
      const scale = (1 - p.t / lifeTime) * a 
      _obj.scale.setScalar(Math.max(0, scale))
      
      _obj.updateMatrix()
      meshRef.current.setMatrixAt(i, _obj.matrix)
    })

    // Notify Three.js to update the instances on the GPU
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 4, 4]} /> 
      <meshStandardMaterial 
        color="#ffffff" 
        transparent 
        opacity={1} // Your opacity parameter
        emissive="#ffffff"
        emissiveIntensity={1} // Your emissive parameter
      />
    </instancedMesh>
  )
}