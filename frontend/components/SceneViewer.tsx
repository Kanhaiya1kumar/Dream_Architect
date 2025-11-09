'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'

type SceneGraph = any

export default function SceneViewer({ scene }: { scene: SceneGraph | null }) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<any>(null)
  const clockRef = useRef(new THREE.Clock())
  const dynamicRefs = useRef<{ mesh: THREE.Object3D; behavior: any; basePos: THREE.Vector3 }[]>([])
  const instancedPools = useRef<THREE.InstancedMesh[]>([])

  function waterMaterial(color: THREE.Color) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: color } },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        void main() {
          vNormal = normalMatrix * normal;
          vec3 pos = position;
          pos.z += 0.03 * sin(4.0 * position.x + uTime*1.5);
          pos.x += 0.03 * sin(4.0 * position.y + uTime*1.7);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormal;
        void main() {
          float fres = pow(1.0 - dot(normalize(vNormal), vec3(0.0,0.0,1.0)), 2.0);
          gl_FragColor = vec4(uColor * (0.7 + 0.3*fres), 1.0);
        }`,
    })
    return mat
  }

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scn = new THREE.Scene()
    sceneRef.current = scn

    const cam = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    cam.position.set(0, 3, 10)
    cameraRef.current = cam

    const controls = new OrbitControls(cam, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    const onResize = () => {
      if (!rendererRef.current || !cameraRef.current) return
      const w = mount.clientWidth, h = mount.clientHeight
      rendererRef.current.setSize(w, h)
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    const animate = () => {
      requestAnimationFrame(animate)
      const t = clockRef.current.getElapsedTime()

      for (const { mesh, behavior, basePos } of dynamicRefs.current) {
        switch (behavior?.kind) {
          case 'rotate': {
            const v = behavior.speed ?? 0.4
            const ax = behavior.axis ?? [0, 1, 0]
            mesh.rotateOnAxis(new THREE.Vector3(ax[0], ax[1], ax[2]).normalize(), v * 0.01)
            break
          }
          case 'orbit': {
            const speed = behavior.speed ?? 0.5
            const r = behavior.radius ?? 6
            const ang = t * speed + mesh.id * 0.05
            mesh.position.set(basePos.x + Math.cos(ang) * r, basePos.y, basePos.z + Math.sin(ang) * r)
            break
          }
          case 'pulse': {
            const amp = behavior.amplitude ?? 0.2
            const speed = behavior.speed ?? 0.6
            const s = 1.0 + amp * Math.sin(t * speed * 2.0)
            mesh.scale.set(s * mesh.scale.x, s * mesh.scale.y, s * mesh.scale.z)
            break
          }
        }
      }

      // advance water shaders
      sceneRef.current!.traverse(obj => {
        const mat: any = (obj as any).material
        if (mat && mat.uniforms && mat.uniforms.uTime) mat.uniforms.uTime.value = t
      })

      controlsRef.current?.update()
      renderer.render(sceneRef.current!, cameraRef.current!)
    }
    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      controls.dispose()
    }
  }, [])

  useEffect(() => {
    if (!scene || !sceneRef.current || !cameraRef.current) return
    const scn = sceneRef.current
    dynamicRefs.current = []
    for (const mesh of instancedPools.current) mesh.dispose?.()
    instancedPools.current = []

    // clear
    while (scn.children.length > 0) scn.remove(scn.children[0])

    // safe defaults
    const skySafe = scene.sky ?? { color_top: { r: 0.2, g: 0.3, b: 0.6 }, color_bottom: { r: 0.8, g: 0.9, b: 1.0 } }
    const groundSafe = scene.ground ?? {
      size: 200,
      material: { kind: 'standard', color: { r: 0.25, g: 0.35, b: 0.25 }, metalness: 0, roughness: 1 },
    }
    const lightsSafe = Array.isArray(scene.lights) ? scene.lights : []
    const objectsSafe = Array.isArray(scene.objects) ? scene.objects : []

    // fog
    if (scene.fog?.enabled && scene.fog.color) {
      scn.fog = new THREE.Fog(
        new THREE.Color(scene.fog.color.r, scene.fog.color.g, scene.fog.color.b),
        scene.fog.near ?? 10,
        scene.fog.far ?? 160,
      )
    } else {
      scn.fog = null
    }

    // camera
    // camera (avoid spread to satisfy TS)
if (scene.camera?.position && scene.camera?.look_at) {
  const pos = Array.isArray(scene.camera.position) ? scene.camera.position as [number, number, number] : [0, 3, 10]
  const lookArr = Array.isArray(scene.camera.look_at) ? scene.camera.look_at as [number, number, number] : [0, 0, 0]

  cameraRef.current.position.set(pos[0], pos[1], pos[2])
  const look = new THREE.Vector3(lookArr[0], lookArr[1], lookArr[2])
  cameraRef.current.lookAt(look)
}


    // background
    const top = new THREE.Color(skySafe.color_top.r, skySafe.color_top.g, skySafe.color_top.b)
    const bottom = new THREE.Color(skySafe.color_bottom.r, skySafe.color_bottom.g, skySafe.color_bottom.b)
    scn.background = top.clone().lerp(bottom, 0.35)

    // lights
    for (const L of lightsSafe) {
      if (L.type === 'ambient') {
        scn.add(new THREE.AmbientLight(new THREE.Color(L.color.r, L.color.g, L.color.b), L.intensity))
      } else if (L.type === 'hemisphere') {
        scn.add(
          new THREE.HemisphereLight(
            new THREE.Color(L.color.r, L.color.g, L.color.b),
            new THREE.Color(0.2, 0.2, 0.25),
            L.intensity,
          ),
        )
      } else if (L.type === 'directional') {
        const l = new THREE.DirectionalLight(new THREE.Color(L.color.r, L.color.g, L.color.b), L.intensity)
        if (L.position) l.position.set(L.position[0], L.position[1], L.position[2])
        scn.add(l)
      }
    }
    if (lightsSafe.length === 0) scn.add(new THREE.AmbientLight(0xffffff, 0.8))

    // ground
    const gCol = new THREE.Color(
      groundSafe.material.color.r,
      groundSafe.material.color.g,
      groundSafe.material.color.b,
    )
    const gMat = new THREE.MeshStandardMaterial({
      color: gCol,
      roughness: groundSafe.material.roughness ?? 1,
      metalness: groundSafe.material.metalness ?? 0,
    })
    const gGeo = new THREE.PlaneGeometry(groundSafe.size, groundSafe.size, 1, 1)
    const ground = new THREE.Mesh(gGeo, gMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scn.add(ground)

    // instancing buckets for tree parts
    const coneGeo = new THREE.ConeGeometry(0.5, 1, 12)
    const cylGeo = new THREE.CylinderGeometry(0.3, 0.3, 2, 16)
    const instancedCones: { mat: THREE.MeshStandardMaterial; mesh: THREE.InstancedMesh; count: number }[] = []
    const instancedCyls: { mat: THREE.MeshStandardMaterial; mesh: THREE.InstancedMesh; count: number }[] = []

    function pushInstanced(
      kind: 'cone' | 'cyl',
      col: THREE.Color,
      pos: number[],
      rot: number[],
      scl: number[],
    ) {
      if (kind === 'cone') {
        let bucket = instancedCones.find(b => b.mat.color.equals(col))
        if (!bucket) {
          const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })
          const mesh = new THREE.InstancedMesh(coneGeo, mat, 1024)
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
          scn.add(mesh)
          instancedCones.push({ mat, mesh, count: 0 })
          instancedPools.current.push(mesh)
          bucket = instancedCones[instancedCones.length - 1]
        }
        const i = bucket.count++
        const m = new THREE.Object3D()
        m.position.set(pos[0], pos[1], pos[2])
        m.rotation.set(rot[0], rot[1], rot[2])
        m.scale.set(scl[0], scl[1], scl[2])
        m.updateMatrix()
        bucket.mesh.setMatrixAt(i, m.matrix)
      } else {
        let bucket = instancedCyls.find(b => b.mat.color.equals(col))
        if (!bucket) {
          const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 1.0 })
          const mesh = new THREE.InstancedMesh(cylGeo, mat, 1024)
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
          scn.add(mesh)
          instancedCyls.push({ mat, mesh, count: 0 })
          instancedPools.current.push(mesh)
          bucket = instancedCyls[instancedCyls.length - 1]
        }
        const i = bucket.count++
        const m = new THREE.Object3D()
        m.position.set(pos[0], pos[1], pos[2])
        m.rotation.set(rot[0], rot[1], rot[2])
        m.scale.set(scl[0], scl[1], scl[2])
        m.updateMatrix()
        bucket.mesh.setMatrixAt(i, m.matrix)
      }
    }

    // objects
    for (const obj of objectsSafe) {
      const c = new THREE.Color(obj.material.color.r, obj.material.color.g, obj.material.color.b)
      const metal = obj.material.metalness ?? 0
      const rough = obj.material.roughness ?? 1

      const isConeTree = obj.primitive === 'cone' && obj.id?.startsWith('tree-leaf')
      const isCylTree = obj.primitive === 'cylinder' && obj.id?.startsWith('tree-trunk')
      if (isConeTree) {
        pushInstanced('cone', c, obj.position, obj.rotation, obj.scale)
        continue
      }
      if (isCylTree) {
        pushInstanced('cyl', c, obj.position, obj.rotation, obj.scale)
        continue
      }

      let mesh: THREE.Mesh
      if (obj.primitive === 'torus') {
        const geo = new THREE.TorusGeometry(2, 0.2, 20, 64)
        const mat = waterMaterial(c.clone())
        mesh = new THREE.Mesh(geo, mat)
      } else {
        const mat = new THREE.MeshStandardMaterial({ color: c, metalness: metal, roughness: rough })
        switch (obj.primitive) {
          case 'box':
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat)
            break
          case 'sphere':
            mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), mat)
            break
          case 'cylinder':
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 24), mat)
            break
          case 'plane':
            mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
            break
          case 'cone':
            mesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 16), mat)
            break
          default:
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat)
        }
      }

      mesh.position.set(obj.position[0], obj.position[1], obj.position[2])
      mesh.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2])
      mesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2])
      scn.add(mesh)

      if (obj.behavior && obj.behavior.kind !== 'none') {
        dynamicRefs.current.push({ mesh, behavior: obj.behavior, basePos: mesh.position.clone() })
      }
    }

    // finalize instanced counts
    for (const b of instancedCones) b.mesh.count = b.count
    for (const b of instancedCyls) b.mesh.count = b.count

    // tone mapping
    const tm = scene.postfx?.tone_mapping
    if (tm === 'reinhard') rendererRef.current!.toneMapping = THREE.ReinhardToneMapping
    else if (tm === 'linear') rendererRef.current!.toneMapping = THREE.LinearToneMapping
    else rendererRef.current!.toneMapping = THREE.ACESFilmicToneMapping

    // quick helpers to confirm scene
    scn.add(new THREE.GridHelper(80, 80))
    const axes = new THREE.AxesHelper(2); axes.position.y = 0.02; scn.add(axes)
  }, [scene])

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
}
