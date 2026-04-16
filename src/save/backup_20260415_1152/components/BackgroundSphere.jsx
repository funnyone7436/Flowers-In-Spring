import React from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function BackgroundSphere() {
  const { scene } = useThree()
  const texture = useLoader(THREE.TextureLoader, '/colorChange_frame_12k_1043_1.png')

  // Set the global background color to white
  // This will show through the transparent parts of your PNG
  //scene.background = new THREE.Color('#ffffff')

  texture.colorSpace = THREE.SRGBColorSpace

  return (
    <mesh 
      scale={[-1, 1, 1]} 
      rotation={[0, Math.PI / 2, 0]}
    >
      <sphereGeometry args={[120, 64, 64]} />
      {/* Use meshBasicMaterial with transparent set to true */}
      <meshBasicMaterial 
        map={texture} 
        side={THREE.BackSide} 
        transparent={true} 
      />
    </mesh>
  )
}