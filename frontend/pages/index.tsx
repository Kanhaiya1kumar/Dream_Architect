import { useState } from 'react'
import dynamic from 'next/dynamic'

const SceneViewer = dynamic(() => import('../components/SceneViewer'), { ssr: false })

export default function Home(){
  const [narrative, setNarrative] = useState('Golden dusk over a quiet lake, a ring of memories around a tall pillar.')
  const [mood, setMood] = useState({ valence: 0.2, arousal: 0.3, warmth: 0.6, nostalgia: 0.7 })
  const [metaphors, setMetaphors] = useState<string[]>([])
  const [scene, setScene] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  async function generate(){
    setLoading(true)
    try{
      const res = await fetch(`${API}/generate-scene`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ narrative, metaphors, mood, seed: Math.floor(Math.random()*1e9), style:'stylized' })
      })
      if(!res.ok) throw new Error('Failed to generate')
      const json = await res.json()
      setScene(json)
    } finally { setLoading(false) }
  }

  function slider(name: keyof typeof mood, min:number, max:number, step=0.01){
    return (
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <span>{name} ({min}..{max})</span>
          <b>{mood[name].toFixed(2)}</b>
        </div>
        <input className='slider' type='range' min={min} max={max} step={step}
          value={mood[name]} onChange={e=>setMood(s=>({...s,[name]:parseFloat(e.target.value)}))}/>
      </div>
    )
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'360px 1fr',height:'100vh'}}>
      <div className='sidebar'>
        <h2 style={{marginTop:0}}>DreamArchitect (No-Key)</h2>
        <p>Describe a feeling or vision, set mood sliders, and generate a 3D world.</p>

        <label>Vision</label>
        <textarea rows={6} value={narrative} onChange={(e)=>setNarrative(e.target.value)} style={{width:'100%',marginBottom:12,background:'#111827',color:'#e5e7eb',border:'1px solid #374151'}}/>

        {slider('valence',-1,1)}
        {slider('arousal',-1,1)}
        {slider('warmth',0,1)}
        {slider('nostalgia',0,1)}

        <button onClick={generate} disabled={loading} style={{width:'100%',padding:10,background:'#2563eb',border:'1px solid #3b82f6',color:'#fff',borderRadius:6}}>
          {loading? 'Generating...' : 'Generate Scene'}
        </button>
      </div>
      <div style={{position:'relative'}}>
        <SceneViewer scene={scene}/>
      </div>
    </div>
  )
}
