import React from 'react'
import './UrgentItems.css'

const URGENT_ITEMS = [
  {
    id: 1,
    task: 'Zwicker & Associates deadline',
    deadline: '2026-04-05',
    owner: 'JEFF',
    level: 'URGENT'
  },
  {
    id: 2,
    task: 'GreenSky loan payoff',
    deadline: '2026-06-07',
    owner: 'JEFF',
    level: 'WARNING'
  },
  {
    id: 3,
    task: 'Kazerouni Law consultation — Call Jennifer (949) 676-7285',
    deadline: null,
    owner: 'JEFF',
    level: 'TODAY'
  },
  {
    id: 4,
    task: 'SPS Insurance call — (800) 258-8602',
    deadline: null,
    owner: 'JEFF',
    level: 'TODAY'
  }
]

function getDaysRemaining(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

function formatDeadline(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function UrgentItems() {
  return (
    <div className="urgent-section">
      <div className="urgent-header">
        <span className="urgent-title">URGENT ITEMS</span>
        <span className="urgent-count">{URGENT_ITEMS.length} items need attention</span>
      </div>
      <div className="urgent-list">
        {URGENT_ITEMS.map(item => {
          const days = getDaysRemaining(item.deadline)
          const levelClass = item.level === 'URGENT' ? 'level-urgent' :
                             item.level === 'WARNING' ? 'level-warning' : 'level-today'
          return (
            <div className="urgent-item" key={item.id}>
              <div className="urgent-item-left">
                <span className={`urgent-level ${levelClass}`}>{item.level}</span>
                <span className="urgent-task">{item.task}</span>
              </div>
              <div className="urgent-item-right">
                {item.deadline && (
                  <span className="urgent-deadline">{formatDeadline(item.deadline)}</span>
                )}
                <span className="urgent-owner">{item.owner}</span>
                {days !== null ? (
                  <span className={`urgent-days ${days <= 7 ? 'days-critical' : 'days-warn'}`}>
                    {days} days
                  </span>
                ) : (
                  <span className="urgent-days days-critical">TODAY</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
