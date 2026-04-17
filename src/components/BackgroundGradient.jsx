import React from 'react'
import { BackSide } from 'three'
import { GradientTexture } from '@react-three/drei'
import { useControls } from 'leva'

export default function BackgroundGradient() {
  // 1. This creates a "Sky Gradient" folder in your Leva panel
  const { topColor, bottomColor } = useControls('Sky Gradient', {
    topColor: '#eae811',   // Default Light Yellow eae7d7
    bottomColor: '#06c4f4' // Default Standard Yellow e7d249
  })

  return (
    <mesh>
      <sphereGeometry args={[500, 32, 32]} />
      <meshBasicMaterial side={BackSide} depthWrite={false}>
        <GradientTexture
          stops={[0, 1]}
          colors={[bottomColor, topColor]} 
          size={1024} 
        />
      </meshBasicMaterial>
    </mesh>
  )
}