import React from 'react'
import './RentRoll.css'

const STATUS_CONFIG = {
  current: { label: 'Current', className: 'pill-green' },
  partial: { label: 'Partial', className: 'pill-amber' },
  delinquent: { label: 'Delinquent', className: 'pill-red' },
  eviction: { label: 'Eviction', className: 'pill-red' },
  vacant: { label: 'Vacant', className: 'pill-gray' }
}

function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function RentRoll({ properties }) {
  const sorted = [...properties].sort((a, b) => b.amountOwed - a.amountOwed)

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Rent Roll</span>
        <span className="section-badge">{properties.length} properties</span>
      </div>
      <div className="table-wrap">
        <table className="rent-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Tenant</th>
              <th>Monthly Rent</th>
              <th>Status</th>
              <th className="th-right">Amount Owed</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(property => {
              const status = STATUS_CONFIG[property.status] || STATUS_CONFIG.vacant
              return (
                <tr key={property.id}>
                  <td>
                    <div className="prop-address">{property.address}</div>
                    <div className="prop-city">{property.city}, {property.state}</div>
                  </td>
                  <td>
                    <span className="tenant-name">{property.tenant}</span>
                  </td>
                  <td>
                    <span className="amount">
                      {property.monthlyRent > 0 ? formatCurrency(property.monthlyRent) : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${status.className}`}>{status.label}</span>
                  </td>
                  <td className="td-right">
                    <span className={`amount ${property.amountOwed > 0 ? 'owed' : 'current'}`}>
                      {property.amountOwed > 0 ? formatCurrency(property.amountOwed) : '$0.00'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
