import React, { useState, useEffect } from 'react'
import './AgendaTopics.css'

const OWNER_OPTIONS = ['Jeff', 'Michael', 'Both', 'Nigel']
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Done', 'Blocked', 'Urgent']

const DEFAULT_AGENDA = [
  { id: 1, emoji: '\u2696\ufe0f', task: 'Daily Attorney Outreach — Find 5 attorneys + draft letters', owner: 'Jeff', status: 'Not Started', notes: '', done: false },
  { id: 2, emoji: '\ud83d\udcf1', task: 'Daily Social Media Quote — Post to Instagram Facebook LinkedIn', owner: 'Nigel', status: 'Not Started', notes: '', done: false },
  { id: 3, emoji: '\ud83c\udfe0', task: 'Review Mortgage Statements — 2245 & 2710 Collingwood', owner: 'Jeff', status: 'Not Started', notes: '', done: false },
  { id: 4, emoji: '\ud83d\udcde', task: 'Call Jennifer Mendez — Kazerouni Law (949) 676-7285', owner: 'Jeff', status: 'Not Started', notes: '', done: false },
  { id: 5, emoji: '\ud83d\udcde', task: 'Call SPS Insurance — (800) 258-8602', owner: 'Jeff', status: 'Not Started', notes: '', done: false },
  { id: 6, emoji: '\ud83c\udf10', task: 'jeffbatton.com — Rex website fixes REX-008 through REX-011', owner: 'Nigel', status: 'Not Started', notes: '', done: false },
  { id: 7, emoji: '\ud83d\udecd\ufe0f', task: 'Word To Wear — Connect wordtowear.shop to Shopify', owner: 'Jeff', status: 'Not Started', notes: '', done: false },
  { id: 8, emoji: '\ud83c\udfac', task: 'Eternal Chasing Treatment — Send to friend', owner: 'Jeff', status: 'Not Started', notes: '', done: false },
  { id: 9, emoji: '\ud83d\udcbc', task: 'Batton Homes Business Meeting — Tuesday March 24', owner: 'Both', status: 'Not Started', notes: '', done: false },
  { id: 10, emoji: '\ud83d\udcda', task: 'Winning Is Not the Goal — Story Rambling Session', owner: 'Jeff', status: 'Not Started', notes: '', done: false }
]

const STORAGE_KEY = 'battonhomes_agenda'

function loadAgenda() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_AGENDA
}

export default function AgendaTopics() {
  const [items, setItems] = useState(loadAgenda)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const statusClass = (status) => {
    switch (status) {
      case 'Done': return 'status-done'
      case 'In Progress': return 'status-progress'
      case 'Blocked': return 'status-blocked'
      case 'Urgent': return 'status-urgent'
      default: return 'status-default'
    }
  }

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Agenda Topics</span>
        <span className="section-badge">{items.filter(i => !i.done).length} remaining</span>
      </div>
      <div className="agenda-list">
        {items.map(item => (
          <div className={`agenda-item ${item.done ? 'agenda-done' : ''}`} key={item.id}>
            <div className="agenda-row">
              <label className="agenda-check">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={e => updateItem(item.id, 'done', e.target.checked)}
                />
                <span className="checkmark" />
              </label>
              <span className="agenda-emoji">{item.emoji}</span>
              <span className="agenda-task">{item.task}</span>
              <select
                className="agenda-select owner-select"
                value={item.owner}
                onChange={e => updateItem(item.id, 'owner', e.target.value)}
              >
                {OWNER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <select
                className={`agenda-select status-select ${statusClass(item.status)}`}
                value={item.status}
                onChange={e => updateItem(item.id, 'status', e.target.value)}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="agenda-notes-row">
              <input
                className="agenda-notes"
                type="text"
                placeholder="Add notes..."
                value={item.notes}
                onChange={e => updateItem(item.id, 'notes', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
