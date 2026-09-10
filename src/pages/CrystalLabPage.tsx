import { useState } from 'react'
import { CRYSTAL_ROTATION_SPEEDS } from '../animations/crystalEnergy'
import { CrystalPreviewScene, PREVIEW_COLORS } from '../scenes/CrystalPreviewScene'
import { MISSIONS } from '../types/arena'
import './crystal-lab.css'

const stages = [
  { progress: 0, detail: 'ENERGIA CONCENTRADA NA BASE' },
  { progress: 1 / 3, detail: 'DOIS NÚCLEOS CONECTADOS' },
  { progress: 2 / 3, detail: 'CADEIA DE ENERGIA QUASE COMPLETA' },
  { progress: 1, detail: 'QUATRO NÚCLEOS EM SOBRECARGA' },
]

export function CrystalLabPage() {
  const [stageIndex, setStageIndex] = useState(0)
  const [comparison, setComparison] = useState(false)
  const [colorIndex, setColorIndex] = useState(0)
  const [fps, setFps] = useState<number | null>(null)
  const stage = stages[stageIndex]

  return <main className="crystal-lab">
    <header className="crystal-lab-header"><span>SYMBIOS // LABORATÓRIO VISUAL</span><h1>EVOLUÇÃO DOS CRISTAIS</h1><p>Um componente · três assinaturas de energia · quatro estágios</p></header>
    <div className="crystal-lab-toolbar">
      <button aria-pressed={!comparison} onClick={() => setComparison(false)}>Três equipes / testar transições</button>
      <button aria-pressed={comparison} onClick={() => setComparison(true)}>Comparar quatro estágios</button>
      {comparison && PREVIEW_COLORS.map(({ name }, index) => <button key={name} aria-pressed={colorIndex === index} onClick={() => setColorIndex(index)}>{name}</button>)}
    </div>
    <section className={`crystal-stage${comparison ? ' crystal-stage--comparison' : ''}`}>
      <CrystalPreviewScene progress={stage.progress} comparisonColor={comparison ? PREVIEW_COLORS[colorIndex].color : undefined} onFps={setFps} />
      <div className="crystal-lab-fps">{fps === null ? 'Medindo FPS…' : `${fps} FPS · média de 2 s`}</div>
      <div className="crystal-team-labels" aria-hidden="true">{comparison
        ? MISSIONS.map((mission, index) => <span key={mission}>{mission}<br />{index + 1} núcleo{index ? 's' : ''} · {(CRYSTAL_ROTATION_SPEEDS[index] / CRYSTAL_ROTATION_SPEEDS[0]).toFixed(2)}×</span>)
        : PREVIEW_COLORS.map(({ name }) => <span key={name}>{name}</span>)}</div>
      <div className="stage-corners" />
    </section>
    {!comparison && <section className="crystal-controls">
      <div className="mission-selector"><span>ESTÁGIO DA MISSÃO</span><div className="stage-options">{MISSIONS.map((mission, index) => <button aria-pressed={index === stageIndex} className={index === stageIndex ? 'is-selected' : ''} key={mission} onClick={() => setStageIndex(index)}><small>0{index + 1}</small>{mission}</button>)}</div></div>
      <div className="stage-readout"><span>NÚCLEOS ATIVOS</span><output>{stageIndex + 1} / 4</output><strong>{stage.detail} · {(CRYSTAL_ROTATION_SPEEDS[stageIndex] / CRYSTAL_ROTATION_SPEEDS[0]).toFixed(2)}×</strong></div>
    </section>}
    <p className="crystal-lab-note">Arraste para inspecionar as faces. Alterne as missões para testar carga, descarga e interrupção da transição. O modo comparativo mantém os estágios estabilizados.</p>
  </main>
}
