import math, random
from typing import List
from .schemas import (GenerationRequest, SceneGraph, Camera, Sky, Light, Ground, Object3D,
                      Material, Color, Behavior, Fog, PostFX)

def clamp(x,a,b): return max(a,min(b,x))
def lerp(a,b,t): return a*(1-t)+b*t
def rnd(a,b): return random.uniform(a,b)

def mood_to_colors(m):
    warm = m.warmth
    val  = (m.valence+1)/2  # map -1..1 -> 0..1
    desat = 0.15 + 0.35*m.nostalgia
    hue = lerp(220, 30, warm)
    def hsv_to_rgb(h, s, v):
        h=(h%360)/60.0; i=int(h); f=h-i
        p=v*(1-s); q=v*(1-s*f); t=v*(1 - s*(1-f))
        if   i==0: r,g,b=v,t,p
        elif i==1: r,g,b=q,v,p
        elif i==2: r,g,b=p,v,t
        elif i==3: r,g,b=p,q,v
        elif i==4: r,g,b=t,p,v
        else:      r,g,b=v,p,q
        return Color(r=r,g=g,b=b)
    sky_top = hsv_to_rgb(hue, clamp(0.5-desat,0,1), lerp(0.3,0.8,val))
    sky_bottom = hsv_to_rgb(lerp(hue,190,0.3), clamp(0.6-desat,0,1), lerp(0.2,0.6,val))
    ground_color = hsv_to_rgb(lerp(110,40,m.warmth), clamp(0.6-desat,0,1), lerp(0.3,0.7,val))
    key_color = hsv_to_rgb(hue, 0.2, lerp(0.6,1.0,val))
    return sky_top, sky_bottom, ground_color, key_color

def pick_time_of_day(arousal):
    if arousal < -0.25: return 'dawn'
    if arousal <  0.35: return 'day'
    if arousal <  0.75: return 'dusk'
    return 'night'

def mk_material(color: Color, metal=0.05, rough=0.9):
    return Material(kind='standard', color=color, metalness=metal, roughness=rough)

def ring_layout(n, radius, y=0.5):
    out=[]; n=max(1,n)
    for i in range(n):
        ang=(i/n)*2*math.pi
        x=math.cos(ang)*radius; z=math.sin(ang)*radius
        out.append([x,y,z,ang])
    return out

def generate_scene(req: GenerationRequest) -> SceneGraph:
    r = random.Random(req.seed) if req.seed is not None else random
    m = req.mood
    t = req.narrative.lower()

    sky_top, sky_bottom, ground_color, key_color = mood_to_colors(m)
    tod = pick_time_of_day(m.arousal)

    # camera
    cam_dist = lerp(10, 6, (m.arousal+1)/2.0)
    camera = Camera(position=[0,3,cam_dist], look_at=[0,0,0])

    # lights
    amb = Light(type='ambient', intensity=0.6, color=sky_bottom)
    hemi = Light(type='hemisphere', intensity=0.45, color=sky_top, position=[0,10,0])
    sun  = Light(type='directional', intensity=0.95, color=key_color, position=[5,8,5])
    lights = [amb, hemi, sun]

    ground = Ground(size=240, material=mk_material(ground_color, 0.0, 1.0))

    wants_trees  = any(k in t for k in ['forest','tree','nature','park','meadow'])
    wants_water  = any(k in t for k in ['lake','ocean','sea','river','rain','water'])
    wants_struct = any(k in t for k in ['temple','ruin','house','city','tower','bridge','pillar','monolith'])
    wants_stars  = ('star' in t) or (tod == 'night')

    objects: List[Object3D] = []

    # central totem
    core_h = lerp(1.2, 3.8, (m.arousal+1)/2.0)
    totem = Object3D(id='totem', primitive='cylinder',
                     position=[0,core_h/2,0], rotation=[0,0,0], scale=[0.8,core_h,0.8],
                     material=mk_material(key_color, 0.2, 0.5))
    totem.behavior = Behavior(kind='pulse', amplitude=0.1+0.2*((m.arousal+1)/2.0), speed=0.35+0.35*((m.arousal+1)/2.0))
    objects.append(totem)

    # memory orbs
    n_orbs = int(lerp(6, 16, m.nostalgia))
    for (x,y,z,a) in ring_layout(max(4,n_orbs), radius=lerp(6,12,(m.arousal+1)/2.0), y=0.9):
        col = Color(r=(key_color.r+sky_top.r)*0.5, g=(key_color.g+sky_top.g)*0.5, b=(key_color.b+sky_top.b)*0.5)
        orb = Object3D(id=f'orb-{len(objects)}', primitive='sphere', position=[x,y,z], rotation=[0,a,0],
                       scale=[0.9,0.9,0.9], material=mk_material(col, 0.0, 0.25))
        orb.behavior = Behavior(kind='orbit', speed=0.25+0.55*((m.arousal+1)/2.0), radius=5+8*((m.arousal+1)/2.0), axis=[0,1,0])
        objects.append(orb)

    if wants_trees:
        for (x,y,z,a) in ring_layout(12, radius=16, y=0.0):
            trunk = mk_material(Color(r=0.25,g=0.13,b=0.05), 0.0, 1.0)
            canopy= mk_material(Color(r=ground_color.r*0.6, g=ground_color.g*1.05, b=ground_color.b*0.6), 0.0, 0.8)
            objects.append(Object3D(id=f'tree-trunk-{x:.2f}', primitive='cylinder', position=[x,1.0,z], scale=[0.3,2.0,0.3], material=trunk))
            objects.append(Object3D(id=f'tree-leaf-{x:.2f}',  primitive='cone',     position=[x,3.0,z], scale=[1.4,2.0,1.4], material=canopy))

    if wants_struct:
        for (x,y,z,a) in ring_layout(6, radius=22, y=0.6):
            col = mk_material(Color(r=0.75,g=0.75,b=0.78), 0.12, 0.6)
            objects.append(Object3D(id=f'pillar-{x:.2f}', primitive='box', position=[x,0.9,z], scale=[1.4,1.6,1.4], material=col))

    if wants_water:
        water_col = Color(r=sky_top.r*0.5, g=sky_top.g*0.6, b=sky_top.b)
        objects.append(Object3D(id='water', primitive='torus', position=[0,0.2,0],
                                scale=[lerp(8,14,(m.arousal+1)/2.0),0.2,lerp(8,14,(m.arousal+1)/2.0)],
                                rotation=[math.pi/2,0,0],
                                material=Material(kind='standard', color=water_col, metalness=0.0, roughness=0.2)))

    if wants_stars:
        for i in range(50):
            x=rnd(-40,40); z=rnd(-40,40); y=rnd(10,25)
            col=Color(r=1.0,g=1.0,b=1.0)
            star=Object3D(id=f'star-{i}', primitive='sphere', position=[x,y,z], scale=[0.05,0.05,0.05], material=mk_material(col, 0.0, 0.0))
            star.behavior = Behavior(kind='rotate', speed=0.1, axis=[0,1,0])
            objects.append(star)

    sky = Sky(time_of_day=tod, color_top=sky_top, color_bottom=sky_bottom)
    fog = Fog(enabled=True, color=sky_bottom, near=12, far=180)
    postfx = PostFX(bloom=True, bloom_strength=0.7+0.3*m.warmth, vignette=True, tone_mapping='aces')

    return SceneGraph(title='DreamArchitect (No-Key Edition)',
                      description=req.narrative, style=req.style,
                      camera=camera, sky=sky, lights=lights, ground=ground,
                      objects=objects, fog=fog, postfx=postfx)
