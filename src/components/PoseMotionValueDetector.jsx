import React from 'react'

export default function PoseMotionValueDetector({ onMotionValue, debug = false }) {
  const videoRef = React.useRef(null)
  // This ref stores the motion state, replacing prevState
  const prevLmRef = React.useRef(null) 
  const poseRef = React.useRef(null)
  const rafRef = React.useRef(0)
  const waitingGesture = React.useRef(false)
  const startedRef = React.useRef(false)

  // --- Asset Loading Configuration ---
  const PUBLIC_BASE = (typeof BASE === 'string' && BASE) ? BASE : '/'
  const LOCAL_BASE = new URL(`${PUBLIC_BASE}vendor/mediapipe/`, window.location.href).href
  const CDN_UNPKG = 'https://unpkg.com/@mediapipe/pose@0.5.167/'
  const CDN_JSD   = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.167/'
  const BASES = [LOCAL_BASE, CDN_UNPKG, CDN_JSD]

  const loadTag = (src) => new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = src; s.async = true
    s.onload = () => res(src)
    s.onerror = () => rej(new Error(`Failed to load <script> ${src}`))
    document.head.appendChild(s)
  })

  async function probeBase(base) {
    try {
      const checks = await Promise.all([
        fetch(base + 'pose.js', { cache: 'no-store' }),
        fetch(base + 'pose_solution_packed_assets_loader.js', { cache: 'no-store' }),
        fetch(base + 'pose_solution_packed_assets.data', { cache: 'no-store' }),
      ])
      return checks.every(r => r.ok)
    } catch { return false }
  }

  async function loadPoseFrom(baseHref) {
    if (baseHref === LOCAL_BASE) {
      const ok = await probeBase(baseHref)
      if (!ok) throw new Error(`Local assets missing at ${baseHref}`)
    }
    await loadTag(`${baseHref}pose.js`)
    const PoseNS = window.Pose || window.pose
    const PoseCtor = PoseNS?.Pose || PoseNS
    if (typeof PoseCtor !== 'function') throw new Error('Pose constructor not found')

    const pose = new PoseCtor({ locateFile: (f) => baseHref + f })
    // NOTE: pose.onResults is set here, using the memoized onResults callback
    pose.onResults(onResults) 
    if (typeof pose.initialize === 'function') await pose.initialize()
    pose.setOptions({
      selfieMode: true,
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.4, 
      minTrackingConfidence: 0.4,
    })
    return pose
  }

  async function loadPose() {
    let lastErr = null
    for (const base of BASES) {
      try {
        debug && console.log('[PoseDetector] loading pose from:', base)
        const p = await loadPoseFrom(base)
        debug && console.log('[PoseDetector] pose loaded from:', base)
        return p
      } catch (e) { lastErr = e; console.warn('[PoseDetector] failed from base:', base, e) }
    }
    throw lastErr || new Error('All pose bases failed')
  }
  // --- END Asset Loading Configuration ---

  // --- Motion Calculation Logic ---
  const onResults = React.useCallback((res) => {
    const lm = res.poseLandmarks
    if (debug) console.log('[PoseDetector] results?', !!lm)

    const now = performance.now()
    let st = prevLmRef.current
    // Initialize or reset motion state object
    if (!st || st.__v !== 3) st = (prevLmRef.current = { __v:3, y:null, t:0, out:0, last:0, g:null }) 

    // Throttle results processing to maintain stability (e.g., ~15 FPS)
    const MIN_GAP_MS = 1000/15 
    if (now - st.last < MIN_GAP_MS) return
    st.last = now

    // 1. No landmarks found: Immediately zero out motion value
    if (!lm) { st.out = 0; onMotionValue?.({ motionValue: 0 }); return }

    // Helper to calculate the average Y position of points (hips or shoulders)
    const takeAvg = (ids, vis=0.5) => {
      const pts = ids.map(i => lm[i]).filter(p => p && (p.visibility ?? 0) >= vis)
      if (!pts.length) return null
      const y = pts.reduce((a,p)=>a+p.y, 0) / pts.length
      return y
    }

    // Prioritize Hips (23, 24); fall back to Shoulders (11, 12)
    let y = takeAvg([23,24], 0.5)  
    if (y == null) y = takeAvg([11,12], 0.5) 
    if (y == null) { st.out = 0; onMotionValue?.({ motionValue: 0 }); return }

    // INIT: First frame with landmarks
    if (st.y == null) { st.y = y; st.t = now; st.out = 0; onMotionValue?.({ motionValue: 0 }); return }

    const dt = Math.max(1e-3, (now - st.t)/1000)
    const vy  = (st.y - y) / dt    // Vertical Velocity (up > 0)
    const DEAD = 0.0015             // Velocity deadzone (ignores small jitters)
    const speed = Math.max(0, Math.abs(vy) - DEAD)

    // Calculate "Lift" (Ground Detection)
    // st.g acts as a slow-moving "ground" reference. 
    // lift > 0 means the body is above its historical low-point (like a jump/lift).
    st.g = st.g ?? y
    const targetG = Math.max(y, st.g)
    st.g = st.g*0.985 + targetG*0.015
    const lift = Math.max(0, st.g - y)

    // Calculate Raw Motion Value (combines speed and lift)
    const raw = speed*1100 + lift*550
    
    // Smoothing: Use a high alpha (0.7) to favor the *new* raw value, 
    // allowing fast reaction, but still smoothing a bit.
    const ALPHA = 0.7 
    st.out = ALPHA*raw + (1-ALPHA)*st.out
    
    // Hard Zero: When speed is zero and lift is very small, force motionValue to 0
    if (speed <= 0 && lift < 0.002) st.out = 0 

    // Output the motion value
    onMotionValue?.({ motionValue: st.out/10 })
    debug && console.log('[PoseDetector] mv=', st.out.toFixed(2), 'vy=', vy.toFixed(4), 'lift=', lift.toFixed(4))

    st.y = y; st.t = now
  }, [onMotionValue, debug])

  // --- Main Loop & Initialization ---
  const loop = React.useCallback(async () => {
    const v = videoRef.current
    if (poseRef.current && v && v.readyState >= 2) {
      // Send the video frame to MediaPipe Pose for processing
      try { await poseRef.current.send({ image: v }) } catch {}
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const start = React.useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    try {
      poseRef.current = await loadPose()
      const v = videoRef.current
      v.playsInline = true; v.muted = true; v.autoplay = true
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'user', width:640, height:480 }, audio:false })
      v.srcObject = stream
      await v.play().catch(()=>{})
      // Pre-run two frames to initialize models
      for (let i=0;i<2;i++) if (poseRef.current && v.readyState>=2) await poseRef.current.send({ image:v })
      
      // Start the main RAF loop
      rafRef.current = requestAnimationFrame(loop)
      console.log('[PoseDetector] camera running')
    } catch (e) {
      waitingGesture.current = true
      startedRef.current = false
      console.warn('[PoseDetector] start failed; will retry on user gesture:', e)
    }
  }, [loop])

  React.useEffect(() => {
    if (!window.isSecureContext && !location.origin.startsWith('http://localhost')) {
      console.warn('Camera requires HTTPS or http://localhost')
      return
    }
    start()
    // Add listeners to retry on user interaction (needed for some browsers)
    const retry = () => { if (waitingGesture.current) start() }
    window.addEventListener('pointerdown', retry)
    window.addEventListener('keydown', retry)
    
    // Cleanup function
    return () => {
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      cancelAnimationFrame(rafRef.current)
      try { poseRef.current?.close() } catch {}
      const s = videoRef.current?.srcObject; if (s) s.getTracks().forEach(t => t.stop())
    }
  }, [start])

  // --- Component Render ---
  return (
    <video
      ref={videoRef}
      style={{
        position:'fixed',
        width: debug ? 240 : 1,
        height: debug ? 180 : 1,
        bottom: debug ? 12 : 'auto',
        right: debug ? 12 : 'auto',
        border: debug ? '1px solid #0f0' : 'none',
        opacity: debug ? 0.85 : 0,
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    />
  )
}