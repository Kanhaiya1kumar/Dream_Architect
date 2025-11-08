from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import GenerationRequest, SceneGraph
from .generator import generate_scene

app = FastAPI(title='DreamArchitect API (No-Key Edition)', version='0.4.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.post('/generate-scene', response_model=SceneGraph)
def generate(req: GenerationRequest):
    return generate_scene(req)
