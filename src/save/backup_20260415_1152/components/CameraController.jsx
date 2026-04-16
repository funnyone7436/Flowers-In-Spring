// src/components/CameraController.jsx
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'

export default function CameraOrbitController({ speed = 0.004, initialAngle = 0 }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef()
  const frameCount = useRef(0)

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.setAzimuthalAngle(initialAngle)
      controlsRef.current.update()
    }
  }, [initialAngle])

  useFrame(() => {
    if (controlsRef.current) {
      // Wait 10 frames before starting auto-rotation
      if (frameCount.current > 10) {
        const angle = controlsRef.current.getAzimuthalAngle() + speed
        controlsRef.current.setAzimuthalAngle(angle)
        controlsRef.current.update()
      } else {
        frameCount.current += 1
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableZoom={true}
      enablePan={false}
      target={[0, 0, 0]}
    />
  )
}
