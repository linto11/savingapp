import React from 'react'

function formatMoney(value, currency) {
  return `${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`
}

function buildPolyline(values, width = 620, height = 180) {
  if (!values || values.length === 0) return ''

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(max - min, 1)

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width
      const y = height - ((value - min) / range) * (height - 20) - 10
      return `${x},${y}`
    })
    .join(' ')
}

function modelBadge(model) {
  if ((model || '').includes('prophet')) {
    return { label: 'Prophet Hybrid', color: 'var(--success-color)' }
  }
  return { label: 'Adaptive Baseline', color: 'var(--warning-color)' }
}

export default function Forecast({ forecastData, selectedDate, onSelectedDateChange }) {
  if (!forecastData) {
    return (
      <div className="glass-card">
        <h2 className="text-lg font-bold" style={{ marginBottom: '8px' }}>Forecast unavailable</h2>
        <p className="text-secondary text-sm">The app is still preparing the 12-month savings projection.</p>
      </div>
    )
  }

  const {
    currency,
    model_used,
    confidence = 0,
    current_balance = 0,
    forecast_balance_1y = 0,
    projected_income_average = 0,
    projected_expense_average = 0,
    projected_net_average = 0,
    selected_prediction,
    selected_date_min,
    selected_date_max,
    months = [],
    goal_forecast = [],
    notes = [],
  } = forecastData

  const badge = modelBadge(model_used)
  const balanceTrendUp = forecast_balance_1y >= current_balance
  const polyline = buildPolyline(months.map((item) => item.projected_balance))
  const maxBalance = Math.max(...months.map((item) => item.projected_balance), 1)

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 className="text-xl font-bold icon-text" style={{ marginBottom: '8px' }}>
          <span className="material-symbols-outlined">insights</span>
          Smart Future Forecast
        </h2>
        <p className="text-secondary text-sm">
          This view estimates how your savings may move for any future date you choose and updates when your expenses change.
        </p>
      </div>

      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 className="text-lg font-bold icon-text" style={{ marginBottom: '6px' }}>
              <span className="material-symbols-outlined">event</span>
              Prediction for a selected date
            </h3>
            <p className="text-secondary text-sm">Choose any date in the forecast window to see the expected balance.</p>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="text-xs text-secondary">Select date</span>
            <input
              type="date"
              value={selectedDate || selected_prediction?.date || ''}
              min={selected_date_min}
              onChange={(e) => onSelectedDateChange?.(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'white' }}
            />
          </label>
        </div>

        {selected_prediction && (
          <div className="grid grid-cols-3" style={{ marginTop: '18px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs text-secondary" style={{ marginBottom: '4px' }}>Predicted balance</p>
              <p className="font-bold" style={{ color: selected_prediction.projected_change >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {formatMoney(selected_prediction.projected_balance, currency)}
              </p>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs text-secondary" style={{ marginBottom: '4px' }}>Change from today</p>
              <p className="font-bold" style={{ color: selected_prediction.projected_change >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {formatMoney(selected_prediction.projected_change, currency)}
              </p>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs text-secondary" style={{ marginBottom: '4px' }}>Available for goals</p>
              <p className="font-bold">{formatMoney(selected_prediction.available_for_goals, currency)}</p>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs text-secondary" style={{ marginBottom: '4px' }}>Forecast distance</p>
              <p className="font-bold">{selected_prediction.days_ahead} days ahead</p>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-summary">
        <div className="glass-card summary-panel">
          <div className="summary-heading">
            <h2 className="text-lg font-bold">Projected balance in 1 year</h2>
            <p className="text-sm text-secondary">Expected savings position after 12 months</p>
          </div>
          <p className="summary-value" style={{ color: balanceTrendUp ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {formatMoney(forecast_balance_1y, currency)}
          </p>
        </div>

        <div className="glass-card summary-panel">
          <div className="summary-heading">
            <h2 className="text-lg font-bold">Average projected monthly net</h2>
            <p className="text-sm text-secondary">Forecasted income minus expense</p>
          </div>
          <p className="summary-value" style={{ color: projected_net_average >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
            {formatMoney(projected_net_average, currency)}
          </p>
        </div>

        <div className="glass-card summary-panel">
          <div className="summary-heading">
            <h2 className="text-lg font-bold">Model in use</h2>
            <p className="text-sm text-secondary">Best available predictor for your data</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ padding: '6px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: badge.color, border: '1px solid var(--border-color)', fontWeight: 700 }}>
              {badge.label}
            </span>
            <span className="text-sm text-secondary">Confidence: {Math.round(confidence * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ alignItems: 'flex-start' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <h3 className="text-lg font-bold icon-text">
              <span className="material-symbols-outlined">show_chart</span>
              Savings trajectory
            </h3>
            <span className="text-sm text-secondary">Now: {formatMoney(current_balance, currency)}</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
            <svg viewBox="0 0 620 180" style={{ width: '100%', height: '180px', display: 'block' }}>
              <line x1="0" y1="170" x2="620" y2="170" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <polyline
                fill="none"
                stroke="var(--accent-color)"
                strokeWidth="4"
                points={polyline}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
            <span className="text-xs text-secondary">Next month</span>
            <span className="text-xs text-secondary">12 months out</span>
          </div>

          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notes.map((note, index) => (
              <div key={index} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <p className="text-sm text-secondary">{note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-bold icon-text" style={{ marginBottom: '16px' }}>
            <span className="material-symbols-outlined">flag</span>
            Goal forecast
          </h3>

          {goal_forecast.length === 0 ? (
            <p className="text-secondary text-sm">Add savings goals to see whether they stay on track.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goal_forecast.map((goal) => (
                <div key={goal.id} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <p className="font-semibold text-sm">{goal.name}</p>
                      <p className="text-xs text-secondary" style={{ marginTop: '4px' }}>
                        Target: {formatMoney(goal.target, currency)}
                      </p>
                    </div>
                    <span style={{ color: goal.on_track ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 700, fontSize: '0.85rem' }}>
                      {goal.on_track ? 'On track' : 'At risk'}
                    </span>
                  </div>
                  <p className="text-xs text-secondary" style={{ marginTop: '8px' }}>
                    Estimated completion: {goal.estimated_completion_month || 'Beyond current forecast window'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '24px' }}>
        <h3 className="text-lg font-bold icon-text" style={{ marginBottom: '16px' }}>
          <span className="material-symbols-outlined">calendar_month</span>
          Monthly outlook
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {months.map((month) => (
            <div key={month.month} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <p className="font-semibold text-sm">{month.month}</p>
                <p className="text-sm" style={{ color: month.net >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                  Net: {formatMoney(month.net, currency)}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="text-xs text-secondary">Income: {formatMoney(month.income, currency)}</span>
                <span className="text-xs text-secondary">Expense: {formatMoney(month.expense, currency)}</span>
                <span className="text-xs text-secondary">Balance: {formatMoney(month.projected_balance, currency)}</span>
              </div>

              <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max((month.projected_balance / maxBalance) * 100, 6)}%`,
                    height: '100%',
                    background: month.net >= 0 ? 'linear-gradient(90deg, var(--accent-color), var(--success-color))' : 'linear-gradient(90deg, var(--danger-color), #f97316)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3" style={{ marginTop: '18px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs text-secondary" style={{ marginBottom: '4px' }}>Projected income avg</p>
            <p className="font-bold">{formatMoney(projected_income_average, currency)}</p>
          </div>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs text-secondary" style={{ marginBottom: '4px' }}>Projected expense avg</p>
            <p className="font-bold">{formatMoney(projected_expense_average, currency)}</p>
          </div>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs text-secondary" style={{ marginBottom: '4px' }}>Projected net avg</p>
            <p className="font-bold" style={{ color: projected_net_average >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
              {formatMoney(projected_net_average, currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
