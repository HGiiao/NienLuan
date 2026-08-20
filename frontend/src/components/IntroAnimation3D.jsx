import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import {
  CITIES, REVEAL_ORDER, FLIGHT_ROUTES, AI_STATES, PRICE_BUBBLES,
  SUGGESTION, VIETNAM_PATH, AiCard, PriceBubble, SuggestionCard, CountdownPill,
} from './IntroAnimation'

/* ─── Bản đồ: viewBox 200x560 → world (tâm ~100, 294) ─── */
const SCALE = 0.012
const CX = 100
const CY = 294
const toWorld = (x, y) => [(x - CX) * SCALE, (y - CY) * SCALE]

let _glowTex = null
function makeGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.2, 'rgba(255,150,70,0.6)')
  g.addColorStop(0.6, 'rgba(249,115,22,0.18)')
  g.addColorStop(1, 'rgba(249,115,22,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  _glowTex = new THREE.CanvasTexture(c)
  return _glowTex
}
const glowTex = () => (_glowTex || makeGlowTexture())

let _landTex = null
function makeLandTexture() {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#D8EEC5')
  g.addColorStop(0.5, '#C3DFA6')
  g.addColorStop(1, '#A9CC88')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 16, 256)
  _landTex = new THREE.CanvasTexture(c)
  return _landTex
}
const landTex = () => (_landTex || makeLandTexture())

function sampleVietnam(samples = 360) {
  const svgNS = 'http://www.w3.org/2000/svg'
  const path = document.createElementNS(svgNS, 'path')
  path.setAttribute('d', VIETNAM_PATH)
  const len = path.getTotalLength()
  const pts = []
  for (let i = 0; i <= samples; i++) {
    const p = path.getPointAtLength((i / samples) * len)
    pts.push(toWorld(p.x, p.y))
  }
  return pts
}

/* ─── 3D Vietnam island (extruded) ─── */
function VietnamIsland({ visible }) {
  const pts = useMemo(sampleVietnam, [])
  const geom = useMemo(() => {
    if (!pts.length) return null
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1,
    })
    g.center()
    return g
  }, [pts])
  const edges = useMemo(() => (geom ? new THREE.EdgesGeometry(geom) : null), [geom])
  const ref = useRef()
  useFrame((_, delta) => {
    if (!ref.current) return
    const target = visible ? 1 : 0
    ref.current.material.opacity += (target - ref.current.material.opacity) * Math.min(delta * 3, 1)
  })
  if (!geom) return null
  return (
    <group>
      <mesh geometry={geom}>
        <meshStandardMaterial map={landTex()} color="#ffffff" metalness={0.05} roughness={0.6} />
      </mesh>
      {edges && (
        <lineSegments geometry={edges} ref={ref}>
          <lineBasicMaterial color="#4C7A2F" transparent opacity={0} />
        </lineSegments>
      )}
    </group>
  )
}

/* ─── City glow node ─── */
function CityNode({ city, visible }) {
  const [x, y] = toWorld(city.x, city.y)
  const [hovered, setHovered] = useState(false)
  const matRef = useRef()
  const pulseRef = useRef()
  const bubble = PRICE_BUBBLES.find(b => b.cityId === city.id)
  useFrame(({ clock }) => {
    const s = hovered ? 1.3 : 0.85 + Math.sin(clock.elapsedTime * 2.2 + x * 9) * 0.15
    if (pulseRef.current) pulseRef.current.scale.setScalar(s)
    if (matRef.current) matRef.current.emissiveIntensity = (hovered ? 3 : 1.6) + Math.sin(clock.elapsedTime * 3 + y * 7) * 0.6
  })
  if (!visible) return null
  return (
    <group position={[x, y, 0.28]}>
      {/* invisible hitbox for hover */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[hovered ? 0.1 : 0.075, 1]} />
        <meshStandardMaterial ref={matRef} color="#f97316" emissive="#f97316" emissiveIntensity={1.8} />
      </mesh>
      <sprite ref={pulseRef} scale={[0.85, 0.85, 1]}>
        <spriteMaterial map={glowTex()} transparent depthWrite={false} opacity={hovered ? 1 : 0.8} />
      </sprite>
      {hovered && (
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }} zIndexRange={[50, 0]}>
          <div className="rounded-xl px-3 py-2 whitespace-nowrap text-xs shadow-xl border"
            style={{ backgroundColor: 'rgba(255,255,255,0.96)', borderColor: 'rgba(249,115,22,0.22)' }}>
            <div className="font-bold mb-0.5" style={{ color: '#0F172A' }}>{city.name}</div>
            {bubble ? bubble.lines.map((l, i) => (
              <div key={i} className="font-medium leading-tight" style={{ color: '#F97316' }}>{l}</div>
            )) : (
              <div className="font-medium" style={{ color: '#F97316' }}>Khởi hành từ đây</div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

/* ─── Flight arc + moving plane ─── */
function FlightArc({ from, to, index, active }) {
  const [fx, fy] = toWorld(from.x, from.y)
  const [tx, ty] = toWorld(to.x, to.y)
  const curve = useMemo(() => {
    const mx = (fx + tx) / 2
    const my = (fy + ty) / 2
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(fx, fy, 0.24),
      new THREE.Vector3(mx, my, 1.35),
      new THREE.Vector3(tx, ty, 0.24),
    )
  }, [fx, fy, tx, ty])
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.014, 6, false), [curve])
  const planeRef = useRef()
  useFrame(({ clock }) => {
    if (!planeRef.current) return
    const t = (clock.elapsedTime * 0.16 + index * 0.33) % 1
    const p = curve.getPoint(t)
    planeRef.current.position.copy(p)
  })
  if (!active) return null
  return (
    <group>
      <mesh geometry={tube}>
        <meshBasicMaterial color="#f97316" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <group ref={planeRef}>
        <mesh>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <sprite scale={[0.7, 0.7, 1]}>
          <spriteMaterial map={glowTex()} transparent opacity={0.9} depthWrite={false} />
        </sprite>
      </group>
    </group>
  )
}

/* ─── Floating dust particles (instanced) ─── */
function Particles({ count = 100 }) {
  const ref = useRef()
  const data = useMemo(() => Array.from({ length: count }, (_, i) => ({
    i,
    pos: new THREE.Vector3((Math.random() - 0.5) * 4.2, (Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 1.8),
    s: 0.4 + Math.random() * 0.8,
    ph: Math.random() * Math.PI * 2,
  })), [count])
  const mat = new THREE.Matrix4()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    data.forEach(d => {
      d.pos.x += Math.sin(t * 0.5 + d.ph) * 0.0006 * d.s
      d.pos.y += Math.cos(t * 0.4 + d.ph) * 0.0006 * d.s
      d.pos.z += Math.sin(t * 0.3 + d.ph * 2) * 0.0004
      mat.makeTranslation(d.pos.x, d.pos.y, d.pos.z)
      ref.current.setMatrixAt(d.i, mat)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <sphereGeometry args={[0.018, 6, 6]} />
      <meshBasicMaterial color="#f97316" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  )
}

/* ─── Interactive orbit controls + auto-rotate when idle ─── */
function InteractiveControls() {
  const [auto, setAuto] = useState(true)
  const timer = useRef()
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.09}
      minDistance={6.5}
      maxDistance={12}
      minPolarAngle={Math.PI * 0.32}
      maxPolarAngle={Math.PI * 0.68}
      autoRotate={auto}
      autoRotateSpeed={0.8}
      onStart={() => { setAuto(false); clearTimeout(timer.current) }}
      onEnd={() => { timer.current = setTimeout(() => setAuto(true), 1800) }}
    />
  )
}

function Scene({ visibleCities, routeActive }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 6, 4]} intensity={1.3} color="#fff7ed" />
      <pointLight position={[-4, 2, 3]} intensity={0.5} color="#f97316" />
      <pointLight position={[4, -2, 2]} intensity={0.35} color="#fb923c" />
      <InteractiveControls />
      <VietnamIsland visible={visibleCities.length > 0} />
      {CITIES.map(c => <CityNode key={c.id} city={c} visible={visibleCities.includes(c.id)} />)}
      {routeActive && FLIGHT_ROUTES.map((r, i) => {
        const from = CITIES.find(c => c.id === r.from)
        const to = CITIES.find(c => c.id === r.to)
        return from && to ? <FlightArc key={i} from={from} to={to} index={i} active /> : null
      })}
      <Particles />
    </>
  )
}

/* ─── Main ─── */
export default function IntroAnimation3D({ onComplete }) {
  const [visibleCities, setVisibleCities] = useState([])
  const [routeActive, setRouteActive] = useState(false)
  const [aiStep, setAiStep] = useState(0)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [countdown, setCountdown] = useState(8)
  const [priceBubbleKey, setPriceBubbleKey] = useState(0)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  /* reveal cities */
  useEffect(() => {
    if (completed) return
    const nextIndex = visibleCities.length
    if (nextIndex >= REVEAL_ORDER.length) return
    const t = setTimeout(() => setVisibleCities(prev => [...prev, REVEAL_ORDER[nextIndex]]), 260)
    return () => clearTimeout(t)
  }, [visibleCities, completed])

  /* routes */
  useEffect(() => {
    if (visibleCities.length < REVEAL_ORDER.length) return
    const t = setTimeout(() => setRouteActive(true), 500)
    return () => clearTimeout(t)
  }, [visibleCities])

  /* AI progression */
  useEffect(() => {
    if (!routeActive) return
    if (aiStep >= AI_STATES.length) { setShowSuggestion(true); return }
    const t = setTimeout(() => setAiStep(p => p + 1), 950)
    return () => clearTimeout(t)
  }, [routeActive, aiStep])

  /* price bubbles cycling */
  useEffect(() => {
    if (!routeActive) return
    let i = 0
    const interval = setInterval(() => { setPriceBubbleKey(i++ % PRICE_BUBBLES.length) }, 2000)
    return () => clearInterval(interval)
  }, [routeActive])

  /* countdown */
  useEffect(() => {
    if (!showSuggestion) return
    const t = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(t); return 0 } return prev - 1 })
    }, 1000)
    return () => clearInterval(t)
  }, [showSuggestion])

  const handleStart = useCallback(() => {
    if (completed) return
    setCompleted(true)
    setTimeout(onComplete, 280)
  }, [completed, onComplete])

  useEffect(() => {
    if (countdown > 0 || completed) return
    const t = setTimeout(handleStart, 600)
    return () => clearTimeout(t)
  }, [countdown, completed, handleStart])

  const activeBubble = PRICE_BUBBLES[priceBubbleKey] || null
  const bubbleStyle = activeBubble ? {
    position: 'absolute',
    left: `${(activeBubble.x / 200) * 100 + 6}%`,
    top: `${(activeBubble.y / 560) * 100}%`,
    transform: 'translateY(-50%)',
    zIndex: 30,
  } : undefined

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F6FB 50%, #FFF3E6 100%)' }}>
      {/* Logo */}
      <motion.div className="absolute top-5 left-5 md:top-8 md:left-8 z-20"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
          style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderColor: 'rgba(249,115,22,0.15)', backdropFilter: 'blur(14px)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{ background: 'linear-gradient(135deg, #F97316, #FB923C)', boxShadow: '0 8px 18px rgba(249,115,22,0.24)' }}>V</div>
          <span className="text-sm font-bold tracking-tight" style={{ color: '#0F172A' }}>Vé247</span>
        </div>
      </motion.div>

      {/* Countdown */}
      <CountdownPill visible={showSuggestion && !completed} seconds={countdown} onSkip={handleStart} />

      {/* Center content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {/* 3D map box */}
        <div className="relative w-full max-w-[340px] md:max-w-[400px] h-[52vh] md:h-[62vh]">
          <Canvas className="absolute inset-0"
            camera={{ position: [0, 0.3, 9], fov: 40 }}
            dpr={[1, 1.5]}
            gl={{ powerPreference: 'high-performance', antialias: true, alpha: true }}>
            <Scene visibleCities={visibleCities} routeActive={routeActive} />
          </Canvas>

          {/* Price bubbles over map */}
          {activeBubble && routeActive && (
            <div style={bubbleStyle} className="pointer-events-none absolute inset-0">
              <PriceBubble bubble={activeBubble} />
            </div>
          )}
        </div>

        {/* AI card */}
        {(routeActive || showSuggestion) && (
          <motion.div className="w-full max-w-sm mt-3"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <AiCard state={AI_STATES[Math.min(aiStep, AI_STATES.length - 1)]} isDone={aiStep >= AI_STATES.length} />
          </motion.div>
        )}

        {/* Suggestion */}
        <div className="w-full max-w-sm mt-3">
          <SuggestionCard show={showSuggestion} onComplete={handleStart} tilt={{ x: 0, y: 0 }} />
        </div>

        {/* Tagline */}
        <motion.div className="mt-8 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}>
          <p className="text-[10px] md:text-xs font-medium" style={{ color: '#94A3B8' }}>
            Nền tảng AI so sánh giá vé máy bay & tàu hỏa trên khắp Việt Nam
          </p>
        </motion.div>
      </div>
    </div>
  )
}