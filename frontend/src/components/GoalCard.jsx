import React, { useState, useEffect } from 'react'

const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft('No deadline')
      return
    }

    const formatTimeRemaining = () => {
      const target = new Date(targetDate).getTime()
      const now = new Date().getTime()
      const diff = target - now
      
      if (diff <= 0) return 'Deadline passed'
      
      const seconds = Math.floor((diff / 1000) % 60)
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      
      const months = Math.floor(days / 30.44)
      const remDays = Math.floor(days % 30.44)
      
      return `${months > 0 ? months + 'mon ' : ''}${remDays > 0 ? remDays + 'day ' : ''}${hours}hr ${seconds}sec`
    }

    setTimeLeft(formatTimeRemaining())
    const timer = setInterval(() => {
      setTimeLeft(formatTimeRemaining())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [targetDate])

  return <p className="font-bold" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{timeLeft}</p>
}

export default function GoalCard({ goal, currency, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  
  const currentAccumulated = goal.base_accumulated || 0
  const progress = Math.min((currentAccumulated / goal.target) * 100, 100)
  const dynamicRemaining = Math.max(goal.target - currentAccumulated, 0)

  return (
    <div 
      className="glass-card" 
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: 'pointer', borderTop: !goal.on_track ? '4px solid var(--danger-color)' : '4px solid var(--success-color)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 className="text-lg font-bold icon-text">
              <span className="material-symbols-outlined">flag</span>
              {goal.name}
            </h3>
            {onEdit && (
              <button 
                className="icon-text"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                Edit
              </button>
            )}
          </div>
          <p className="text-sm text-secondary">Target: {goal.target.toLocaleString()} {currency}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="text-xs text-secondary">
            Deadline: {goal.target_date ? new Date(goal.target_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'No Date'}
          </p>
          <CountdownTimer targetDate={goal.target_date} />
        </div>
      </div>
      
      <div style={{ margin: '16px 0', background: 'var(--border-color)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, background: 'var(--accent-color)', height: '100%' }}></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p className="text-sm">
          <span className="text-secondary">Pending: </span>
          {dynamicRemaining > 0 ? `${dynamicRemaining.toLocaleString(undefined, {maximumFractionDigits: 2})} ${currency}` : '0'}
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
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <div className="grid grid-cols-2" style={{ gap: '12px' }}>
            <div>
              <p className="text-xs text-secondary">Currently Accumulated</p>
              <p className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {currentAccumulated.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}
              </p>
            </div>
            <div>
              <p className="text-xs text-secondary">Required Savings/mo</p>
              <p className="font-semibold text-danger">
                {dynamicRemaining > 0 ? (dynamicRemaining / Math.max(1, (new Date(goal.target_date) - new Date()) / (30.44 * 24 * 3600000))).toLocaleString(undefined, {maximumFractionDigits: 0}) : 0} {currency}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

