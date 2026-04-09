import React, { useState } from 'react'

export default function GoalCard({ goal, currency, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  
  const currentAccumulated = goal.base_accumulated || 0
  const progress = Math.min((currentAccumulated / goal.target) * 100, 100)
  const dynamicRemaining = Math.max(goal.target - currentAccumulated, 0)

  const getDaysRemaining = (targetDate) => {
    if (!targetDate) return 'No deadline'
    const target = new Date(targetDate).getTime()
    const now = new Date().getTime()
    const diff = target - now
    if (diff <= 0) return 'Deadline passed'
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return `${days} days remaining`
  }

  return (
    <div 
      className="glass-card" 
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: 'pointer', borderTop: !goal.on_track ? '4px solid var(--danger-color)' : '4px solid var(--success-color)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 className="text-lg font-bold icon-text">
              <span className="material-symbols-outlined">flag</span>
              {goal.name}
            </h3>
            {onEdit && (
              <button 
                className="icon-text"
                title="Edit"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
              </button>
            )}
          </div>
          <p className="text-sm text-secondary" style={{ whiteSpace: 'nowrap' }}>Target: {goal.target.toLocaleString()} {currency}</p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p className="text-xs text-secondary">
            Deadline: {goal.target_date ? new Date(goal.target_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'No Date'}
          </p>
          <p className="font-bold text-sm" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {getDaysRemaining(goal.target_date)}
          </p>
        </div>
      </div>
      
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="text-xs font-bold text-success">{progress.toFixed(1)}%</span>
          <span className="text-xs text-secondary">{progress === 100 ? 'Goal Reached!' : 'In Progress'}</span>
        </div>
        <div style={{ background: 'var(--border-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, background: 'var(--accent-color)', height: '100%' }}></div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <p className="text-sm">
          <span className="text-secondary">Pending: </span>
          <span style={{ whiteSpace: 'nowrap' }}>{dynamicRemaining > 0 ? `${dynamicRemaining.toLocaleString(undefined, {maximumFractionDigits: 2})} ${currency}` : '0'}</span>
        </p>
        {goal.on_track ? (
          <p className="text-sm text-success">On track! Projected {Math.ceil(goal.projected_months_needed)} mon</p>
        ) : (
          <p className="text-sm text-danger icon-text">
            <span className="material-symbols-outlined" style={{fontSize: '1em'}}>warning</span> 
            Shortfall warning
          </p>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div className="grid grid-cols-2" style={{ gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p className="text-xs text-secondary">Currently Accumulated</p>
              <p className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {currentAccumulated.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p className="text-xs text-secondary">Required Savings/mo</p>
              <p className="font-semibold text-danger" style={{ whiteSpace: 'nowrap' }}>
                {dynamicRemaining > 0 ? (dynamicRemaining / Math.max(1, (new Date(goal.target_date) - new Date()) / (30.44 * 24 * 3600000))).toLocaleString(undefined, {maximumFractionDigits: 0}) : 0} {currency}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
