import React, { useState, useEffect } from 'react'
import './Header.css'

export default function Header() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const formatted = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return (
    <header className="header">
      <div className="header-brand">
        <h1 className="header-title">BattonHomes HQ</h1>
        <div className="header-divider" />
        <span className="header-sub">Command Center</span>
      </div>
      <div className="header-right">
        <span className="header-timestamp">{formatted} &middot; {time}</span>
        <div className="live-pill">
          <div className="live-dot" />
          LIVE
        </div>
      </div>
    </header>
  )
}
