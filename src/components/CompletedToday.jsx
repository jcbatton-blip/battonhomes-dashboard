import React, { useState, useEffect } from 'react'
import './CompletedToday.css'

const TODAY_KEY = () => {
  const d = new Date()
  return `battonhomes_completed_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DEFAULT_ITEMS = [
  { id: 1, text: 'All 8 Word To Wear products loaded in Printify', done: true },
  { id: 2, text: 'BattonHomesHQ dashboard rebuilt and deployed', done: true },
  { id: 3, text: 'FTC complaint filed', done: true },
  { id: 4, text: 'Kazerouni Law responded \u2014 Jennifer Mendez', done: true },
  { id: 5, text: 'GitHub repo connected to Netlify', done: true },
  { id: 6, text: 'Two Prong YouTube strategy saved to Notion', done: true }
]

function loadItems() {
  try {
    const saved = localStorage.getItem(TODAY_KEY())
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_ITEMS
}

export default function CompletedToday() {
  const [items, setItems] = useState(loadItems)
  const [newText, setNewText] = useState('')

  useEffect(() => {
    localStorage.setItem(TODAY_KEY(), JSON.stringify(items))
  }, [items])

  const toggleItem = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ))
  }

  const addItem = () => {
    if (!newText.trim()) return
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1
    setItems(prev => [...prev, { id: newId, text: newText.trim(), done: true }])
    setNewText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addItem()
  }

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Completed Today</span>
        <span className="section-badge">{items.filter(i => i.done).length} done</span>
      </div>
      <div className="completed-list">
        {items.map(item => (
          <div className="completed-item" key={item.id}>
            <label className="completed-check">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleItem(item.id)}
              />
            </label>
            <span className={`completed-text ${item.done ? 'is-done' : ''}`}>
              {item.text}
            </span>
          </div>
        ))}
        <div className="completed-add">
          <input
            className="completed-input"
            type="text"
            placeholder="+ Add completed item..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="completed-btn" onClick={addItem}>Add</button>
        </div>
      </div>
    </div>
  )
}
