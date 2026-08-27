import { useState } from 'react'
import { CrystalPreviewScene } from '../scenes/CrystalPreviewScene'
import { MISSIONS } from '../types/arena'

const stages = [
  { progress: 0, detail: 'ENERGIA CONCENTRADA NA BASE' },
  { progress: 0.33, detail: 'CARGA EM EXPANSÃO' },
  { progress: 0.66, detail: 'QUASE TOTALMENTE CARREGADO' },
  { progress: 1, detail: 'ENERGIA MÁXIMA' },
]

export function CrystalLabPage() {
  const [stageIndex, setStageIndex] = useState(0)
  const stage = stages[stageIndex]

  return <main className="crystal-lab">
    <header className="crystal-lab-header"><span>SYMBIOS // LABORATÓRIO VISUAL</span><h1>EVOLUÇÃO DOS CRISTAIS</h1><p>Um componente · três assinaturas de energia · quatro estágios</p></header>
    <section className="crystal-stage">
      <CrystalPreviewScene progress={stage.progress} />
      <div className="crystal-team-labels" aria-hidden="true"><span>VERMELHO</span><span>AZUL</span><span>VERDE</span></div>
      <div className="stage-corners" />
    </section>
    <section className="crystal-controls">
      <div className="mission-selector"><span>ESTÁGIO DA MISSÃO</span><div className="stage-options">{MISSIONS.map((mission, index) => <button className={index === stageIndex ? 'is-selected' : ''} key={mission} onClick={() => setStageIndex(index)}><small>0{index + 1}</small>{mission}</button>)}</div></div>
      <div className="stage-readout"><span>NÍVEL VISUAL</span><output>{Math.round(stage.progress * 100)}%</output><strong>{stage.detail}</strong></div>
    </section>
  </main>
}
