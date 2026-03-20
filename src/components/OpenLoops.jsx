import React, { useState, useEffect } from 'react'
import './OpenLoops.css'

const OWNER_OPTIONS = ['Jeff', 'Michael', 'Both', 'Nigel']

const DEFAULT_LOOPS = [
  { id: 1, name: 'Trust / Will / Property Transfer Planning', owner: 'Jeff', opened: 'Ongoing', notes: '' },
  { id: 2, name: 'Schlosser Eviction — 3290 Collingwood', owner: 'Michael', opened: 'Ongoing', notes: '' },
  { id: 3, name: 'wordtowear.shop domain \u2192 Shopify connection', owner: 'Jeff', opened: 'Ongoing', notes: '' },
  { id: 4, name: 'vpnpicksguide.com + aitoolspicked.com rebuild', owner: 'Nigel', opened: 'Ongoing', notes: '' },
  { id: 5, name: 'BattonHomes full system build', owner: 'Nigel', opened: 'Desktop April 2026', notes: '' },
  { id: 6, name: 'Faceless YouTube channels — Two prong strategy', owner: 'Nigel', opened: 'Desktop April 2026', notes: '' }
]

const STORAGE_KEY = 'battonhomes_openloops'

function loadLoops() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_LOOPS
}

export default function OpenLoops() {
  const [loops, setLoops] = useState(loadLoops)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loops))
  }, [loops])

  const updateLoop = (id, field, value) => {
    setLoops(prev => prev.map(loop =>
      loop.id === id ? { ...loop, [field]: value } : loop
    ))
  }

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Open Loops</span>
        <span className="section-badge">{loops.length} open &middot; never close until resolved</span>
      </div>
      <div className="loops-list">
        {loops.map(loop => (
          <div className="loop-item" key={loop.id}>
            <div className="loop-row">
              <div className="loop-indicator" />
              <span className="loop-name">{loop.name}</span>
              <select
                className="agenda-select owner-select"
                value={loop.owner}
                onChange={e => updateLoop(loop.id, 'owner', e.target.value)}
              >
                {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <span className="loop-opened">{loop.opened}</span>
            </div>
            <div className="loop-notes-row">
              <input
                className="loop-notes"
                type="text"
                placeholder="Add notes..."
                value={loop.notes}
                onChange={e => updateLoop(loop.id, 'notes', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
