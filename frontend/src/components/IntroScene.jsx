import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

function Earth() {
  const earthRef = useRef()
  const cloudsRef = useRef()

  const earthMap = useLoader(THREE.TextureLoader, '/images/earth-texture.jpg')
  const cloudsMap = useLoader(THREE.TextureLoader, '/images/earth-clouds.png')
  const specularMap = useLoader(THREE.TextureLoader, '/images/earth-water.png')

  useFrame((_, delta) => {
    earthRef.current.rotation.y += delta * 0.06
    cloudsRef.current.rotation.y += delta * 0.08
  })

  return (
    <group>
      {/* Earth core — real texture */}
      <Sphere ref={earthRef} args={[1.8, 64, 64]}>
        <meshPhongMaterial
          map={earthMap}
          specularMap={specularMap}
          specular={new THREE.Color('#555555')}
          shininess={20}
        />
      </Sphere>

      {/* Clouds */}
      <Sphere ref={cloudsRef} args={[1.84, 48, 48]}>
        <meshPhongMaterial map={cloudsMap} transparent opacity={0.3} depthWrite={false} />
      </Sphere>

      {/* Atmosphere — warm tone, not blue */}
      <Sphere args={[2.05, 32, 32]}>
        <meshBasicMaterial color="#FDBA74" transparent opacity={0.08} side={THREE.BackSide} />
      </Sphere>

      {/* Outer rim — subtle warm */}
      <Sphere args={[2.15, 32, 32]}>
        <meshBasicMaterial color="#FED7AA" transparent opacity={0.05} side={THREE.BackSide} />
      </Sphere>

      {/* Wireframe — very subtle */}
      <Sphere args={[1.86, 20, 20]}>
        <meshBasicMaterial color="#E2E8F0" wireframe transparent opacity={0.06} />
      </Sphere>

      {/* Shadow */}
      <mesh position={[0, -2.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 64]} />
        <meshBasicMaterial color="#F97316" transparent opacity={0.04} />
      </mesh>
    </group>
  )
}

function Plane({ onLoopComplete }) {
  const groupRef = useRef()
  const trailRef = useRef()
  const trailPositions = useRef([])
  const startTime = useRef(Date.now())
  const DURATION = 6000

  useFrame(() => {
    const elapsed = Date.now() - startTime.current
    const progress = Math.min(elapsed / DURATION, 1)
    const angle = progress * Math.PI * 2
    const x = Math.cos(angle) * 3.2
    const z = Math.sin(angle) * 2.4
    const y = Math.sin(angle * 1.5) * 0.9 + 0.3
    groupRef.current.position.set(x, y, z)

    const nextAngle = (progress + 0.02) * Math.PI * 2
    groupRef.current.lookAt(
      Math.cos(nextAngle) * 3.2,
      Math.sin(nextAngle * 1.5) * 0.9 + 0.3,
      Math.sin(nextAngle) * 2.4
    )

    trailPositions.current.push(new THREE.Vector3(x, y, z))
    if (trailPositions.current.length > 200) trailPositions.current.shift()
    if (trailRef.current && trailPositions.current.length > 2) {
      const geo = new THREE.BufferGeometry().setFromPoints(trailPositions.current)
      trailRef.current.geometry.dispose()
      trailRef.current.geometry = geo
    }
    if (progress >= 1 && onLoopComplete) onLoopComplete()
  })

  return (
    <>
      {/* Trail — orange brand gradient */}
      <line ref={trailRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#F97316" transparent opacity={0.8} linewidth={3} />
      </line>

      {/* Plane — white metallic */}
      <group ref={groupRef} scale={[0.5, 0.5, 0.5]}>
        <mesh>
          <capsuleGeometry args={[0.07, 0.5, 8, 16]} />
          <meshStandardMaterial color="#FFFFFF" metalness={0.5} roughness={0.15} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.65, 0.015, 0.14]} />
          <meshStandardMaterial color="#F5F5F5" metalness={0.4} roughness={0.2} />
        </mesh>
        <mesh position={[-0.22, 0.07, 0]}>
          <boxGeometry args={[0.12, 0.1, 0.015]} />
          <meshStandardMaterial color="#F5F5F5" metalness={0.4} />
        </mesh>
        <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.2, 0.01, 0.05]} />
          <meshStandardMaterial color="#F5F5F5" metalness={0.4} />
        </mesh>
        {/* Engine glow — orange */}
        <pointLight color="#F97316" intensity={1.0} distance={1.2} />
      </group>
    </>
  )
}

function FloatingParticles() {
  const positions = useMemo(() => {
    const pos = new Float32Array(300 * 3)
    for (let i = 0; i < 300 * 3; i++) pos[i] = (Math.random() - 0.5) * 30
    return pos
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={300} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#FDBA74" size={0.05} sizeAttenuation transparent opacity={0.4} />
    </points>
  )
}

function Scene({ onLoopComplete }) {
  return (
    <>
      {/* Warm lighting — not blue */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#FFFFFF" />
      <directionalLight position={[-3, 2, 4]} intensity={0.4} color="#FFF7ED" />
      <pointLight position={[0, 0, -4]} intensity={0.3} color="#F97316" />

      <FloatingParticles />
      <Earth />
      <Plane onLoopComplete={onLoopComplete} />
    </>
  )
}

export default function IntroScene({ onLoopComplete }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <Canvas camera={{ position: [2, 1, 6], fov: 50 }} style={{ background: 'transparent' }}
      onCreated={() => setLoaded(true)}>
      {loaded && <Scene onLoopComplete={onLoopComplete} />}
    </Canvas>
  )
}
