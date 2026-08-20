import { useState } from 'react'
import { CrystalPreviewScene } from '../scenes/CrystalPreviewScene'

const crystalColors = [
  { name: 'Titã Vermelho', value: '#ff3b4f' },
  { name: 'Titã Azul', value: '#21a8ff' },
  { name: 'Titã Verde', value: '#9bdf4c' },
]

export function CrystalLabPage() {
  const [color, setColor] = useState(crystalColors[1].value)
  const [progress, setProgress] = useState(0.45)

  return <main className="crystal-lab">
    <header className="crystal-lab-header"><span>SYMBIOS // LABORATÓRIO VISUAL</span><h1>CRISTAL DE ENERGIA</h1><p>Geometria procedural · material translúcido · Bloom</p></header>
    <section className="crystal-stage"><CrystalPreviewScene color={color} progress={progress} /><div className="stage-corners" /></section>
    <section className="crystal-controls">
      <div><span>COR DO CRISTAL</span><div className="color-options">{crystalColors.map((option) => <button className={option.value === color ? 'is-selected' : ''} key={option.value} onClick={() => setColor(option.value)} style={{ '--swatch': option.value } as React.CSSProperties}>{option.name}</button>)}</div></div>
      <label><span>NÍVEL DE ENERGIA</span><output>{Math.round(progress * 100)}%</output><input type="range" min="0" max="1" step="0.01" value={progress} onChange={(event) => setProgress(Number(event.target.value))} /></label>
    </section>
  </main>
}
