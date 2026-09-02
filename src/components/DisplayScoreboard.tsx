import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import { DisplayTeamCard } from './DisplayTeamCard'
import type { Team } from '../types/arena'

export function DisplayScoreboard({ teams }: { teams: Team[] }) {
  const rows = useRef<Partial<Record<Team['id'], HTMLDivElement>>>({})
  const previousTops = useRef<Partial<Record<Team['id'], number>>>({})
  const orderKey = teams.map((team) => team.id).join(',')

  useLayoutEffect(() => {
    const tweens: gsap.core.Tween[] = []
    const nextTops: Partial<Record<Team['id'], number>> = {}

    teams.forEach((team) => {
      const row = rows.current[team.id]
      if (!row) return
      const top = row.getBoundingClientRect().top
      const previousTop = previousTops.current[team.id]
      nextTops[team.id] = top
      if (previousTop === undefined || previousTop === top) return
      tweens.push(gsap.fromTo(row, { y: previousTop - top }, { y: 0, duration: 0.42, ease: 'power2.inOut', overwrite: true }))
    })

    previousTops.current = nextTops
    return () => tweens.forEach((tween) => tween.kill())
  }, [orderKey, teams])

  return <aside className="scoreboard" aria-label="Classificação da arena">
    <header className="scoreboard__header">
      <div><span>PLACAR OFICIAL</span><h1>CLASSIFICAÇÃO</h1></div>
      <p><i />AO VIVO</p>
    </header>
    <div className="scoreboard__teams">
      {teams.map((team, index) => <div ref={(element) => { if (element) rows.current[team.id] = element }} key={team.id}>
        <DisplayTeamCard team={team} rank={index + 1} />
      </div>)}
    </div>
    <footer className="scoreboard__footer"><span>03 TITÃS CONECTADOS</span><span>SYNC // ARENA</span></footer>
  </aside>
}
