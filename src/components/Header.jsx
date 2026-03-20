import React from 'react'
import './Header.css'

export default function Header() {
  const now = new Date()
  const formatted = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <header className="header">
      <div className="header-brand">
        <h1 className="header-title">BattonHomes</h1>
        <div className="header-divider" />
        <span className="header-sub">The Batton Group, LLC · Command Center</span>
      </div>
      <div className="header-right">
        <span className="header-updated">Updated {formatted}</span>
        <div className="live-pill">
          <div className="live-dot" />
          LIVE
        </div>
      </div>
    </header>
  )
}
