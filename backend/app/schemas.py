from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class Mood(BaseModel):
    valence: float = Field(0, ge=-1.0, le=1.0)   # -1..1
    arousal: float = Field(0, ge=-1.0, le=1.0)   # -1..1 for your UI
    warmth:  float = Field(0, ge=0.0, le=1.0)    # 0..1
    nostalgia: float = Field(0, ge=0.0, le=1.0)  # 0..1

class GenerationRequest(BaseModel):
    narrative: str
    metaphors: List[str] = []
    mood: Mood
    seed: Optional[int] = None
    style: Optional[Literal['stylized','realistic','lowpoly']] = 'stylized'

class Color(BaseModel):
    r: float; g: float; b: float

class Material(BaseModel):
    kind: Literal['standard','lambert','phong'] = 'standard'
    color: Color
    metalness: float = 0.0
    roughness: float = 1.0

class Behavior(BaseModel):
    kind: Literal['none','rotate','orbit','pulse'] = 'none'
    speed: float = 0.4
    radius: float = 6.0
    amplitude: float = 0.2
    axis: List[float] = [0,1,0]

class Object3D(BaseModel):
    id: str
    primitive: Literal['box','sphere','cylinder','plane','cone','torus']
    position: List[float] = [0,0,0]
    rotation: List[float] = [0,0,0]
    scale:    List[float] = [1,1,1]
    material: Material
    behavior: Behavior = Behavior()

class Light(BaseModel):
    type: Literal['ambient','hemisphere','directional']
    intensity: float = 1.0
    color: Color
    position: List[float] | None = None

class Sky(BaseModel):
    time_of_day: Literal['dawn','day','dusk','night'] = 'day'
    color_top: Color
    color_bottom: Color

class Ground(BaseModel):
    size: float = 200.0
    material: Material

class Camera(BaseModel):
    position: List[float] = [0,3,8]
    look_at:  List[float] = [0,0,0]

class Fog(BaseModel):
    enabled: bool = True
    color: Color
    near: float = 10.0
    far: float = 160.0

class PostFX(BaseModel):
    bloom: bool = True
    bloom_strength: float = 0.8
    vignette: bool = True
    tone_mapping: Literal['aces','reinhard','linear'] = 'aces'

class SceneGraph(BaseModel):
    title: str
    description: str
    style: str
    camera: Camera
    sky: Sky
    lights: List[Light]
    ground: Ground
    objects: List[Object3D]
    fog: Fog
    postfx: PostFX
