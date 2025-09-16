import { useState } from 'react'
import './App.css'
import MapView from './MapView'

function App() {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | undefined>(undefined)

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    const resp = await fetch('http://localhost:4000/convert', { method: 'POST', body: form })
    if (!resp.ok) {
      const err = await resp.text()
      alert('Conversion failed: ' + err)
      return
    }
    const data = await resp.json()
    setGeojson(data)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', zIndex: 10, top: 12, left: 12, background: 'white', padding: 8, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <input type="file" accept=".dwg,.dxf" onChange={onFileChange} />
      </div>
      <MapView geojson={geojson} />
    </div>
  )
}

export default App
