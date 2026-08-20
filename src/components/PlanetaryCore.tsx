export function PlanetaryCore() {
  return <div className="planetary-core" aria-label="Núcleo Planetário">
    <div className="core-grid" />
    <div className="core-satellite satellite-one" />
    <div className="core-satellite satellite-two" />
    <div className="core-orbit orbit-one" />
    <div className="core-orbit orbit-two" />
    <div className="core-orbit orbit-three" />
    <div className="core-world"><div className="world-hemisphere" /><div className="world-light" /></div>
    <div className="core-reticle"><span /><span /><span /><span /></div>
    <div className="core-caption"><span>OBJETIVO CENTRAL</span><strong>NÚCLEO<br />PLANETÁRIO</strong></div>
  </div>
}
