import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, invalidate, useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial, type PerspectiveCamera } from 'three'
import { Line, OrbitControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { FOOTPRINT, componentPosition, type CircuitComponent, type CircuitGraph, type SimulationReport } from '../../../domain/circuit'
import { pointerKind } from '../drag/dragController'
import { useComponentDrag } from '../drag/useComponentDrag'
import type { MotionPreference } from '../useMotionPreference'
import { PALETTE } from '../../../ui/palette'
import { attachContextLossHandler } from './webgl'
import {
  BENCH_SIZE,
  fitCameraDistance,
  ORBIT_LIMITS,
  PORT_HEIGHT,
  lampGlow,
  lampPulseActive,
  lampPulseFactor,
  litLampCount,
  sceneFrameloop,
  placeGraph,
  rayToBench,
  terminalWorldPosition,
  toWorld,
  WORLD_SCALE,
  wireArcMid,
  wireEnergized,
  type ComponentPlacement,
} from './geometry'

export interface LabSceneProps {
  /** Canonical graph from labStore. The scene keeps no circuit state of its own. */
  graph: CircuitGraph
  /** Derived simulation report. Lamp glow is computed from this alone. */
  report: SimulationReport
  pendingTerminalId?: string | null
  /** From useMotionPreference: flow animation, pixel ratio, antialiasing and frameloop. */
  motion: MotionPreference
  /** The WebGL context was lost (GPU reset, tab backgrounded on some devices). The parent falls back to the schematic. */
  onContextLost?: () => void
  /** Same labStore actions the schematic uses. The scene never mutates the graph itself. */
  onSelectTerminal?: (terminalId: string) => void
  onToggleSwitch?: (componentId: string) => void
  /** Same labStore action the schematic and keyboard use. Called once per finished drag, never per frame. */
  onMoveComponent?: (componentId: string, position: { x: number; y: number }) => void
  /** Called once, after the first frame has been rendered. The parent treats a missing first frame as a failed 3D view. */
  onFirstFrame?: () => void
}

// docs/04 palette, shared with Tailwind and the CSS variables.
const COLORS = {
  bench: PALETTE.navyLight,
  benchEdge: PALETTE.navyLighter,
  aqua: PALETTE.aqua,
  gold: PALETTE.gold,
  slate: PALETTE.muted,
  goldDim: PALETTE.goldDim,
  aquaDim: PALETTE.aquaDim,
  dark: PALETTE.navy,
  coral: PALETTE.coral,
}

function BatteryModel({ span }: { span: number }) {
  const body = span - 0.2
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.28, 0.28, body, 32]} />
        <meshStandardMaterial color="#2b4a8a" metalness={0.45} roughness={0.38} />
      </mesh>
      {/* Gold band near the positive end, like a label ring. */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-body / 2 + 0.25, 0.3, 0]}>
        <cylinderGeometry args={[0.285, 0.285, 0.08, 32]} />
        <meshStandardMaterial color={COLORS.gold} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Positive cap at terminal 0 (local -x): brushed gold metal. */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-body / 2 - 0.05, 0.3, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.1, 24]} />
        <meshStandardMaterial color={COLORS.gold} metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[body / 2 + 0.03, 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 24]} />
        <meshStandardMaterial color={COLORS.slate} metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  )
}

/**
 * Glass bulb with a filament inside. Glow comes only from `lit` and `intensity`, which the caller reads from the
 * simulation report (lampGlow). Nothing here decides whether the lamp is on.
 */
function LampModel({ intensity, lit, pulse }: { intensity: number; lit: boolean; pulse: boolean }) {
  const glow = lit ? 0.6 + 2 * intensity : 0
  const filament = useRef<MeshStandardMaterial>(null)
  const halo = useRef<MeshBasicMaterial>(null)
  const haloOpacity = 0.12 + 0.2 * intensity
  // Report-driven pulse: only runs while `pulse` is true (lit lamp and motion allowed). Resets to the static glow after.
  useFrame(({ clock }) => {
    if (!pulse) return
    const k = lampPulseFactor(clock.elapsedTime)
    if (filament.current) filament.current.emissiveIntensity = glow * k
    if (halo.current) halo.current.opacity = Math.min(1, haloOpacity * k)
  })
  useEffect(() => {
    if (pulse) return
    if (filament.current) filament.current.emissiveIntensity = glow
    if (halo.current) halo.current.opacity = haloOpacity
  }, [pulse, glow, haloOpacity])
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.32, 0.38, 0.24, 32]} />
        <meshStandardMaterial color="#4a5878" metalness={0.75} roughness={0.4} />
      </mesh>
      {[0.27, 0.34].map(y => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.27, 0.03, 8, 28]} />
          <meshStandardMaterial color={COLORS.slate} metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      {/* Filament and its two support posts. */}
      {[-0.07, 0.07].map(x => (
        <mesh key={x} position={[x, 0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
          <meshStandardMaterial color={COLORS.slate} metalness={0.8} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, 0]}>
        <torusGeometry args={[0.07, 0.016, 8, 20, Math.PI]} />
        <meshStandardMaterial
          ref={filament}
          color={lit ? '#fff3c4' : '#6b7894'}
          emissive={COLORS.gold}
          emissiveIntensity={glow}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
      {lit && (
        <mesh position={[0, 0.66, 0]}>
          <sphereGeometry args={[0.24, 20, 16]} />
          <meshBasicMaterial ref={halo} color={COLORS.gold} transparent opacity={haloOpacity} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, 0.68, 0]}>
        <sphereGeometry args={[0.4, 32, 24]} />
        <meshPhysicalMaterial
          color={lit ? '#ffe9a8' : '#bcd0f0'}
          transparent
          opacity={lit ? 0.3 : 0.2}
          roughness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.05}
          emissive={COLORS.gold}
          emissiveIntensity={lit ? 0.15 * intensity : 0}
          depthWrite={false}
        />
      </mesh>
      {lit && <pointLight position={[0, 0.7, 0]} color={COLORS.gold} intensity={2.5 * intensity} distance={5} />}
    </group>
  )
}

function ResistorModel({ span }: { span: number }) {
  const body = Math.max(0.6, span - 0.5)
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.16, 0.16, body, 20]} />
        <meshStandardMaterial color="#c9a46a" roughness={0.6} metalness={0.1} />
      </mesh>
      {[-0.2, 0, 0.2].map((x, i) => (
        <mesh key={x} rotation={[0, 0, Math.PI / 2]} position={[x, 0.3, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.06, 20]} />
          <meshStandardMaterial color={['#7a3b1d', '#111111', '#c0392b'][i]} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function SwitchModel({ closed, onToggle }: { closed: boolean; onToggle: () => void }) {
  return (
    <group>
      {/* Invisible, larger hit box so the whole switch is easy to click or tap. */}
      <mesh
        position={[0, 0.3, 0]}
        onClick={e => {
          e.stopPropagation()
          onToggle()
        }}
        onPointerOver={() => setCursor(true)}
        onPointerOut={() => setCursor(false)}
      >
        <boxGeometry args={[1.4, 0.8, 1.0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.0, 0.2, 0.6]} />
        <meshStandardMaterial color="#3a4766" roughness={0.55} metalness={0.3} />
      </mesh>
      {/* Lever: flat when closed, raised when open */}
      <group position={[-0.35, 0.3, 0]} rotation={[0, 0, closed ? 0 : 0.6]}>
        <mesh position={[0.35, 0, 0]}>
          <boxGeometry args={[0.7, 0.07, 0.14]} />
          <meshStandardMaterial color={closed ? COLORS.aqua : COLORS.gold} metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

function JumperModel({ span }: { span: number }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]} position={[0, PORT_HEIGHT, 0]}>
      <cylinderGeometry args={[0.06, 0.06, Math.max(span, 0.2), 12]} />
      <meshStandardMaterial color={COLORS.coral} roughness={0.5} />
    </mesh>
  )
}

function Model({
  component,
  placement,
  report,
  pulse,
  onToggleSwitch,
}: {
  component: CircuitComponent
  placement: ComponentPlacement
  report: SimulationReport
  pulse: boolean
  onToggleSwitch?: (componentId: string) => void
}) {
  switch (component.type) {
    case 'battery':
      return <BatteryModel span={placement.span} />
    case 'lamp': {
      const glow = lampGlow(report, component.id)
      return <LampModel lit={glow.lit} intensity={glow.intensity} pulse={pulse && glow.lit} />
    }
    case 'resistor':
      return <ResistorModel span={placement.span} />
    case 'switch':
      return <SwitchModel closed={component.isOn} onToggle={() => onToggleSwitch?.(component.id)} />
    case 'wire':
      return <JumperModel span={placement.span} />
  }
}

function setCursor(on: boolean) {
  document.body.style.cursor = on ? 'pointer' : ''
}

function Port({
  position,
  pending,
  onSelect,
}: {
  position: [number, number, number]
  pending: boolean
  onSelect?: () => void
}) {
  const [hover, setHover] = useState(false)
  const active = pending || hover
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[pending ? 0.14 : hover ? 0.13 : 0.1, 16, 12]} />
        <meshStandardMaterial
          color={active ? COLORS.aqua : COLORS.gold}
          emissive={active ? COLORS.aqua : COLORS.gold}
          emissiveIntensity={pending ? 0.9 : hover ? 0.7 : 0.35}
        />
      </mesh>
      {/* Ring on the bench around the port: aqua when active, dim gold otherwise. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <torusGeometry args={[0.2, 0.025, 8, 28]} />
        <meshStandardMaterial
          color={active ? COLORS.aqua : COLORS.goldDim}
          emissive={active ? COLORS.aqua : COLORS.goldDim}
          emissiveIntensity={pending ? 0.9 : hover ? 0.6 : 0.2}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
      {/* Invisible, larger hit target (about 0.7 world units) for fingers and imprecise pointers. */}
      <mesh
        onClick={e => {
          e.stopPropagation()
          onSelect?.()
        }}
        onPointerOver={e => {
          e.stopPropagation()
          setHover(true)
          setCursor(true)
        }}
        onPointerOut={() => {
          setHover(false)
          setCursor(false)
        }}
      >
        <sphereGeometry args={[0.35, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function FlowDot({ a, mid, b }: { a: [number, number, number]; mid: [number, number, number]; b: [number, number, number] }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = (clock.elapsedTime * 0.5) % 1
    // Quadratic Bezier through the same control point the wire line uses.
    const u = 1 - t
    m.position.set(
      u * u * a[0] + 2 * u * t * mid[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * mid[1] + t * t * b[1],
      u * u * a[2] + 2 * u * t * mid[2] + t * t * b[2],
    )
    invalidate()
  })
  return (
    <mesh ref={ref} position={a}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={COLORS.gold} />
    </mesh>
  )
}

/** One soft radial-gradient texture shared by every contact shadow. No extra render pass, so it is cheap on software GL. */
function useBlobTexture(): CanvasTexture | null {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
    g.addColorStop(0, 'rgba(0,0,0,0.75)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}

function BlobShadow({ texture, span }: { texture: CanvasTexture; span: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <planeGeometry args={[span + 0.9, 1.5]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} opacity={0.7} />
    </mesh>
  )
}

const FOOT_HALF_W = FOOTPRINT.width / WORLD_SCALE / 2
const FOOT_HALF_D = FOOTPRINT.height / WORLD_SCALE / 2
/**
 * Outline of the space a part occupies on the bench. Used for hover (aqua, solid), the drop preview (aqua, dashed)
 * and a blocked drop (coral, solid). Shape differs as well as colour, so the state is not colour alone.
 */
function FootprintMarker({ position, color, dashed, testId }: { position: [number, number, number]; color: string; dashed: boolean; testId: string }) {
  const y = 0.03
  const points: [number, number, number][] = [
    [-FOOT_HALF_W, y, -FOOT_HALF_D],
    [FOOT_HALF_W, y, -FOOT_HALF_D],
    [FOOT_HALF_W, y, FOOT_HALF_D],
    [-FOOT_HALF_W, y, FOOT_HALF_D],
    [-FOOT_HALF_W, y, -FOOT_HALF_D],
  ]
  return (
    <group position={position} name={testId}>
      <Line points={points} color={color} lineWidth={3} dashed={dashed} dashSize={0.16} gapSize={0.1} />
    </group>
  )
}
function ContextLossWatcher({ onContextLost }: { onContextLost?: () => void }) {
  const canvas = useThree(s => s.gl.domElement)
  useEffect(() => (onContextLost ? attachContextLossHandler(canvas, onContextLost) : undefined), [canvas, onContextLost])
  return null
}
function Scene({ graph: storedGraph, report, pendingTerminalId, motion, onSelectTerminal, onToggleSwitch, onMoveComponent, onContextLost }: LabSceneProps) {
  const drag = useComponentDrag(storedGraph, (id, position) => onMoveComponent?.(id, position))
  // While a part is dragged, the scene draws it (and its wires) at the snapped preview spot. The store changes on drop.
  const graph = drag.displayGraph
  const dragging = drag.state.phase === 'dragging' ? drag.state : null
  const active = drag.state.phase !== 'idle'
  const controls = useThree(s => s.controls) as { enabled: boolean } | null
  const [hoverId, setHoverId] = useState<string | null>(null)
  // Orbit is off for as long as a gesture on a part is in progress, and always comes back.
  useEffect(() => {
    if (!active || !controls) return
    controls.enabled = false
    // Fallback for a release that R3F does not deliver to the part (pointer left it before the drag began).
    const end = () => {
      if (drag.getState().phase !== 'idle') drag.release()
    }
    const abort = () => drag.cancel()
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', abort)
    return () => {
      controls.enabled = true
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', abort)
    }
  }, [active, controls]) // eslint-disable-line react-hooks/exhaustive-deps
  const isDragging = dragging !== null
  useEffect(() => {
    if (!isDragging) return
    document.body.style.cursor = 'grabbing'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') drag.cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.cursor = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [isDragging]) // eslint-disable-line react-hooks/exhaustive-deps
  const rayPoint = (e: ThreeEvent<PointerEvent>) =>
    rayToBench(e.ray.origin.toArray() as [number, number, number], e.ray.direction.toArray() as [number, number, number])
  const bindDrag = (c: CircuitComponent) => ({
    onPointerOver: () => {
      setHoverId(c.id)
      if (c.type !== 'switch' && !active) document.body.style.cursor = 'grab'
    },
    onPointerOut: () => {
      setHoverId(h => (h === c.id ? null : h))
      if (!active) document.body.style.cursor = ''
    },
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      const ne = e.nativeEvent
      if (!ne.isPrimary || (ne.pointerType === 'mouse' && ne.button !== 0)) return
      const at = rayPoint(e)
      if (!at) return
      // Turn orbit off before it can start rotating on this same press.
      if (controls) controls.enabled = false
      drag.press(c.id, { x: ne.clientX, y: ne.clientY }, at, pointerKind(ne.pointerType))
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      if (drag.getState().phase === 'idle') return
      const at = rayPoint(e)
      if (!at) return
      const was = drag.getState().phase
      drag.move({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }, at)
      // Capture only once the press has become a drag, so a plain click on a port or switch is untouched.
      if (was === 'pressed' && drag.getState().phase === 'dragging') {
        try {
          ;(e.target as unknown as Element).setPointerCapture(e.pointerId)
        } catch {
          // The drag still follows the pointer while it stays over the bench.
        }
      }
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      if (drag.getState().phase === 'idle') return
      try {
        ;(e.target as unknown as Element).releasePointerCapture(e.pointerId)
      } catch {
        // Nothing was captured (a press that never became a drag).
      }
      drag.release()
    },
    onPointerCancel: () => drag.cancel(),
    onLostPointerCapture: () => drag.cancel(),
  })
  const placements = placeGraph(graph)
  const animate = motion.animateFlow
  const pulse = lampPulseActive(motion.calm, litLampCount(graph, report))
  const blob = useBlobTexture()
  return (
    <>
      <ContextLossWatcher onContextLost={onContextLost} />
      <color attach="background" args={[COLORS.dark]} />
      {/* Key (warm, front right), fill (cool, left) and rim (aqua, behind) plus a soft sky/ground bounce. */}
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#bcd4ff', COLORS.dark, 0.55]} />
      <directionalLight position={[4, 8, 5]} intensity={1.2} color="#fff1d6" />
      <directionalLight position={[-6, 4, 3]} intensity={0.35} color="#9ad8ff" />
      <directionalLight position={[0, 5, -7]} intensity={0.8} color={COLORS.aqua} />
      {/* Matte bench top on a slightly wider, brushed edge plate. */}
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[BENCH_SIZE[0] + 0.4, 0.1, BENCH_SIZE[1] + 0.4]} />
        <meshStandardMaterial color={COLORS.benchEdge} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[BENCH_SIZE[0], 0.12, BENCH_SIZE[1]]} />
        <meshStandardMaterial color={COLORS.bench} roughness={0.92} metalness={0} />
      </mesh>
      <gridHelper args={[BENCH_SIZE[0], 23, COLORS.benchEdge, COLORS.benchEdge]} position={[0, 0.001, 0]} />
      {placements.map(p => {
        const component = graph.components.find(c => c.id === p.componentId)
        if (!component) return null
        return (
          <group
            key={p.componentId}
            name={p.componentId}
            position={p.position}
            rotation={[0, p.rotationY, 0]}
            {...bindDrag(component)}
          >
            {blob && <BlobShadow texture={blob} span={p.span} />}
            {/* Invisible body-sized hit box so thin parts are easy to grab. Shorter than the part so the ports at its ends stay clickable. */}
            {component.type !== 'switch' && (
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[Math.max(0.6, p.span - 0.8), 0.7, 1.0]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            )}
            <Model component={component} placement={p} report={report} pulse={pulse} onToggleSwitch={onToggleSwitch} />
          </group>
        )
      })}
      {hoverId && !dragging && graph.components.some(c => c.id === hoverId) && (
        <FootprintMarker
          testId={`hover-${hoverId}`}
          position={toWorld(componentPosition(graph.components.find(c => c.id === hoverId)!))}
          color={COLORS.aqua}
          dashed={false}
        />
      )}
      {dragging && (
        <FootprintMarker
          testId={dragging.plan.ok ? 'snap-preview' : 'snap-blocked'}
          position={toWorld(dragging.plan.position)}
          color={dragging.plan.ok ? COLORS.aqua : COLORS.coral}
          dashed={dragging.plan.ok}
        />
      )}
      {/* Ports are in world space so wires and ports line up exactly with graph terminals. */}
      {placements.flatMap(p =>
        p.ports.map(port => (
        <Port
            key={port.terminalId}
            position={port.position}
            pending={pendingTerminalId === port.terminalId}
            onSelect={() => onSelectTerminal?.(port.terminalId)}
          />
        )),
      )}
      {graph.wires.map((w, index) => {
        const a = terminalWorldPosition(graph, w.fromTerminalId)
        const b = terminalWorldPosition(graph, w.toTerminalId)
        if (!a || !b) return null
        const mid = wireArcMid(a, b, index)
        const energized = wireEnergized(graph, report, w)
        return (
          <group key={w.id}>
            <Line
              points={[a, mid, b]}
              color={energized ? COLORS.gold : COLORS.slate}
              lineWidth={energized ? 4 : 2}
              transparent
              opacity={energized ? 1 : 0.6}
            />
            {energized && animate && <FlowDot a={a} mid={mid} b={b} />}
          </group>
        )
      })}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping={false}
        minDistance={ORBIT_LIMITS.minDistance}
        maxDistance={ORBIT_LIMITS.maxDistance}
        minPolarAngle={ORBIT_LIMITS.minPolarAngle}
        maxPolarAngle={ORBIT_LIMITS.maxPolarAngle}
      />
    </>
  )
}

/** Pulls the camera back on narrow canvases so the whole bench is in view. Keeps the learner's orbit direction. */
function FitCamera() {
  const camera = useThree(s => s.camera)
  const size = useThree(s => s.size)
  useEffect(() => {
    const persp = camera as PerspectiveCamera
    const target = fitCameraDistance(size.width / Math.max(1, size.height), persp.fov)
    const len = camera.position.length()
    if (len > 0 && Math.abs(len - target) > 0.01 && len < target) {
      camera.position.multiplyScalar(target / len)
      camera.updateProjectionMatrix()
      invalidate()
    }
  }, [camera, size.width, size.height])
  return null
}
/** Reports the first rendered frame once. Without it the parent cannot tell a working scene from a silent failure. */
function FrameProbe({ onFirstFrame }: { onFirstFrame?: () => void }) {
  const done = useRef(false)
  useFrame(() => {
    if (done.current) return
    done.current = true
    onFirstFrame?.()
  })
  return null
}
export default function LabScene(props: LabSceneProps) {
  return (
    <Canvas
      frameloop={sceneFrameloop(props.motion.calm, litLampCount(props.graph, props.report))}
      dpr={props.motion.dpr}
      camera={{ position: [0, 6.5, 8], fov: 45 }}
      gl={{ antialias: props.motion.antialias, powerPreference: props.motion.lowPower ? 'low-power' : 'default' }}
      style={{ touchAction: 'none' }}
    >
      <FitCamera />
      <FrameProbe onFirstFrame={props.onFirstFrame} />
      <Scene {...props} />
    </Canvas>
  )
}
