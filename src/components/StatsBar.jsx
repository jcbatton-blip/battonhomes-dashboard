import React, { useState, useEffect } from 'react'
import './StatsBar.css'

export default function StatsBar({ totalOwed, totalProperties, delinquentCount }) {
  const [balance, setBalance] = useState(() => {
    return localStorage.getItem('battonhomes_bank_balance') || ''
  })
  const [editing, setEditing] = useState(false)

  const saveBalance = () => {
    localStorage.setItem('battonhomes_bank_balance', balance)
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveBalance()
    if (e.key === 'Escape') setEditing(false)
  }

  const currentCount = totalProperties - delinquentCount
  const collectionRate = totalProperties > 0
    ? Math.round((currentCount / totalProperties) * 100)
    : 0

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-accent blue" />
        <div className="stat-label">Current Bank Balance</div>
        {editing ? (
          <div className="stat-edit-row">
            <span className="stat-dollar">$</span>
            <input
              className="stat-input"
              type="text"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveBalance}
              autoFocus
              placeholder="0.00"
            />
          </div>
        ) : (
          <div
            className="stat-value clickable"
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {balance ? `$${Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'Click to set'}
          </div>
        )}
        <div className="stat-sub">Click to update</div>
      </div>
      <div className="stat-card">
        <div className="stat-accent red" />
        <div className="stat-label">Outstanding Rent</div>
        <div className="stat-value red">
          ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="stat-sub">{delinquentCount} delinquent &middot; {totalProperties} properties</div>
      </div>
      <div className="stat-card">
        <div className="stat-accent" style={{ background: collectionRate >= 60 ? 'var(--amber)' : 'var(--red)' }} />
        <div className="stat-label">Collection Rate</div>
        <div className="stat-value" style={{ color: collectionRate >= 60 ? 'var(--amber)' : 'var(--red)' }}>
          {collectionRate}%
        </div>
        <div className="stat-sub">{currentCount} of {totalProperties} current or partial</div>
      </div>
    </div>
  )
}
