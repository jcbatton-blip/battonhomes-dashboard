import React from 'react'
import './StatsBar.css'

export default function StatsBar({ totalOwed, totalProperties, delinquentCount }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-accent red" />
        <div className="stat-label">Outstanding Rent</div>
        <div className="stat-value red">
          ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="stat-sub">{delinquentCount} delinquent · {totalProperties} properties total</div>
      </div>
      <div className="stat-card">
        <div className="stat-accent blue" />
        <div className="stat-label">Total Properties</div>
        <div className="stat-value">{totalProperties}</div>
        <div className="stat-sub">Detroit, MI · Batton Homes portfolio</div>
      </div>
      <div className="stat-card">
        <div className="stat-accent amber" />
        <div className="stat-label">Collection Rate</div>
        <div className="stat-value amber">
          {totalProperties > 0
            ? Math.round(
                (properties_current(totalProperties, delinquentCount) / totalProperties) * 100
              )
            : 0}%
        </div>
        <div className="stat-sub">Properties current or partial</div>
      </div>
    </div>
  )
}

function properties_current(total, delinquent) {
  return total - delinquent
}
