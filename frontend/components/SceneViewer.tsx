'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'

type SceneGraph = any

function Behaving({obj}:{obj:any}){
  const ref = useRef<THREE.Object3D>(null!)
  const base = useMemo(()=> new THREE.Vector3().fromArray(obj.position), [obj.position])
  useFrame(({clock})=>{
    const t = clock.getElapsedTime()
    const b = obj.behavior ?? {kind:'none'}
    if(!ref.current) return
    if(b.kind==='rotate'){
      const v = b.speed ?? 0.4; const ax = new THREE.Vector3(...(b.axis??[0,1,0])).normalize()
      ref.current.rotateOnAxis(ax, v*0.01)
    } else if(b.kind==='orbit'){
      const speed=b.speed??0.5, r=b.radius??6, ang=t*speed + (ref.current.id%100)*0.05
      ref.current.position.set(base.x + Math.cos(ang)*r, base.y, base.z + Math.sin(ang)*r)
    } else if(b.kind==='pulse'){
      const amp=b.amplitude??0.2, speed=b.speed??0.6, s=1.0 + amp*Math.sin(t*speed*2.0)
      ref.current.scale.setScalar(s)
    }
  })
  const mat = useMemo(()=> new THREE.MeshStandardMaterial({
    color: new THREE.Color(obj.material.color.r, obj.material.color.g, obj.material.color.b),
    metalness: obj.material.metalness ?? 0, roughness: obj.material.roughness ?? 1
  }), [obj.material])
  let geo: JSX.Element
  switch(obj.primitive){
    case 'box':      geo=<boxGeometry args={[1,1,1]}/>;break
    case 'sphere':   geo=<sphereGeometry args={[0.5,32,16]}/>;break
    case 'cylinder': geo=<cylinderGeometry args={[0.5,0.5,1,24]}/>;break
    case 'plane':    geo=<planeGeometry args={[1,1]}/>;break
    case 'cone':     geo=<coneGeometry args={[0.5,1,16]}/>;break
    case 'torus':    geo=<torusGeometry args={[2,0.2,20,64]}/>;break
    default:         geo=<boxGeometry args={[1,1,1]}/>
  }
  return (
    <mesh ref={ref} position={obj.position} rotation={obj.rotation} scale={obj.scale} material={mat}>
      {geo}
    </mesh>
  )
}

function SceneContent({scene}:{scene:SceneGraph}){
  const fogColor = useMemo(()=> new THREE.Color(scene.fog.color.r, scene.fog.color.g, scene.fog.color.b), [scene.fog.color])
  return (
    <>
      <color attach="background" args={[
        (scene.sky.color_top.r+scene.sky.color_bottom.r)/2,
        (scene.sky.color_top.g+scene.sky.color_bottom.g)/2,
        (scene.sky.color_top.b+scene.sky.color_bottom.b)/2
      ]} />
      {scene.fog?.enabled && <fog attach="fog" color={fogColor} near={scene.fog.near} far={scene.fog.far}/>}

      {/* lights */}
      {scene.lights.map((L:any,idx:number)=>{
        if(L.type==='ambient') return <ambientLight key={idx} intensity={L.intensity} color={new THREE.Color(L.color.r,L.color.g,L.color.b)}/>
        if(L.type==='hemisphere') return <hemisphereLight key={idx} intensity={L.intensity} skyColor={new THREE.Color(L.color.r,L.color.g,L.color.b)} groundColor={new THREE.Color(0.2,0.2,0.25)}/>
        return <directionalLight key={idx} intensity={L.intensity} color={new THREE.Color(L.color.r,L.color.g,L.color.b)} position={L.position??[5,8,5]}/>
      })}

      {/* ground */}
      <mesh rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[scene.ground.size, scene.ground.size]}/>
        <meshStandardMaterial color={new THREE.Color(scene.ground.material.color.r,scene.ground.material.color.g,scene.ground.material.color.b)} roughness={scene.ground.material.roughness??1} metalness={scene.ground.material.metalness??0}/>
      </mesh>

      {/* objects */}
      {scene.objects.map((o:any)=>( <Behaving key={o.id} obj={o}/> ))}

      {/* helpers */}
      <gridHelper args={[80,80]} position={[0,0.01,0]}/>
      <axesHelper args={[2]} position={[0,0.02,0]}/>

      {/* sky/environment presets */}
      <Sky distance={450000} inclination={0} azimuth={0.25} />
      <Environment preset={scene.sky.time_of_day==='night' ? 'night' : 'sunset'} />
    </>
  )
}

export default function SceneViewer({scene}:{scene: SceneGraph|null}){
  return (
    <Canvas camera={{position:[0,3,10], fov:60}} shadows>
      <OrbitControls enableDamping dampingFactor={0.05} target={[0,1,0]} />
      {scene ? <SceneContent scene={scene}/> : null}
    </Canvas>
  )
}
