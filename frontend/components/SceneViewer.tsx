'use client'
import React, { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Sky } from '@react-three/drei'
import * as THREE from 'three'

type SceneGraph = any

function Behaving({ obj }: { obj: any }) {
  const ref = useRef<THREE.Object3D>(null!)
  const base = useMemo(() => new THREE.Vector3().fromArray(obj.position ?? [0, 0, 0]), [obj.position])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const b = obj.behavior ?? { kind: 'none' }
    if (!ref.current) return

    if (b.kind === 'rotate') {
      const v = b.speed ?? 0.4
      const ax = new THREE.Vector3(...(b.axis ?? [0, 1, 0])).normalize()
      ref.current.rotateOnAxis(ax, v * 0.01)
    } else if (b.kind === 'orbit') {
      const speed = b.speed ?? 0.5
      const r = b.radius ?? 6
      const ang = t * speed + (ref.current.id % 100) * 0.05
      ref.current.position.set(base.x + Math.cos(ang) * r, base.y, base.z + Math.sin(ang) * r)
    } else if (b.kind === 'pulse') {
      const amp = b.amplitude ?? 0.2
      const speed = b.speed ?? 0.6
      const s = 1.0 + amp * Math.sin(t * speed * 2.0)
      ref.current.scale.setScalar(s)
    }
  })

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(
          obj.material?.color?.r ?? 1,
          obj.material?.color?.g ?? 1,
          obj.material?.color?.b ?? 1
        ),
        metalness: obj.material?.metalness ?? 0,
        roughness: obj.material?.roughness ?? 1
      }),
    [obj.material]
  )

  let geo: React.ReactNode
  switch (obj.primitive) {
    case 'box':
      geo = <boxGeometry args={[1, 1, 1]} />
      break
    case 'sphere':
      geo = <sphereGeometry args={[0.5, 32, 16]} />
      break
    case 'cylinder':
      geo = <cylinderGeometry args={[0.5, 0.5, 1, 24]} />
      break
    case 'plane':
      geo = <planeGeometry args={[1, 1]} />
      break
    case 'cone':
      geo = <coneGeometry args={[0.5, 1, 16]} />
      break
    case 'torus':
      geo = <torusGeometry args={[2, 0.2, 20, 64]} />
      break
    default:
      geo = <boxGeometry args={[1, 1, 1]} />
  }

  return (
    <mesh
      ref={ref}
      position={obj.position ?? [0, 0, 0]}
      rotation={obj.rotation ?? [0, 0, 0]}
      scale={obj.scale ?? [1, 1, 1]}
      material={mat}
    >
      {geo}
    </mesh>
  )
}

function SceneContent({ scene }: { scene: SceneGraph }) {
  const fogColor = useMemo(
    () => new THREE.Color(scene.fog?.color?.r ?? 0.2, scene.fog?.color?.g ?? 0.3, scene.fog?.color?.b ?? 0.6),
    [scene.fog?.color]
  )

  const top = scene.sky?.color_top ?? { r: 0.2, g: 0.3, b: 0.6 }
  const bottom = scene.sky?.color_bottom ?? { r: 0.8, g: 0.9, b: 1.0 }

  return (
    <>
      <color attach="background" args={[(top.r + bottom.r) / 2, (top.g + bottom.g) / 2, (top.b + bottom.b) / 2]} />

      {scene.fog?.enabled && <fog attach="fog" color={fogColor} near={scene.fog.near ?? 10} far={scene.fog.far ?? 150} />}

      {/* lights */}
      {(scene.lights ?? []).map((L: any, idx: number) => {
        const col = new THREE.Color(L.color?.r ?? 1, L.color?.g ?? 1, L.color?.b ?? 1)
        if (L.type === 'ambient') return <ambientLight key={idx} intensity={L.intensity ?? 0.6} color={col} />
        if (L.type === 'hemisphere')
          return <hemisphereLight key={idx} intensity={L.intensity ?? 0.4} skyColor={col} groundColor={new THREE.Color(0.2, 0.2, 0.25)} />
        return <directionalLight key={idx} intensity={L.intensity ?? 0.9} color={col} position={L.position ?? [5, 8, 5]} />
      })}

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[scene.ground?.size ?? 200, scene.ground?.size ?? 200]} />
        <meshStandardMaterial
          color={
            new THREE.Color(
              scene.ground?.material?.color?.r ?? 0.25,
              scene.ground?.material?.color?.g ?? 0.35,
              scene.ground?.material?.color?.b ?? 0.25
            )
          }
          roughness={scene.ground?.material?.roughness ?? 1}
          metalness={scene.ground?.material?.metalness ?? 0}
        />
      </mesh>

      {/* objects */}
      {(scene.objects ?? []).map((o: any) => (
        <Behaving key={o.id} obj={o} />
      ))}

      {/* helpers */}
      <gridHelper args={[80, 80]} position={[0, 0.01, 0]} />
      <axesHelper args={[2]} position={[0, 0.02, 0]} />

      {/* sky/environment presets */}
      <Sky distance={450000} inclination={0} azimuth={0.25} />
      <Environment preset={scene.sky?.time_of_day === 'night' ? 'night' : 'sunset'} />
    </>
  )
}

export default function SceneViewer({ scene }: { scene: SceneGraph | null }) {
  return (
    <Canvas camera={{ position: [0, 3, 10], fov: 60 }} shadows>
      <OrbitControls enableDamping dampingFactor={0.05} target={[0, 1, 0]} />
      {scene ? <SceneContent scene={scene} /> : null}
    </Canvas>
  )
}
