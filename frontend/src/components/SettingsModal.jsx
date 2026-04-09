import React, { useState, useEffect } from 'react'

export default function SettingsModal({ isOpen, onClose, onRefresh }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          setSettings(data)
          setLoading(false)
        })
        .catch(err => {
          setError(err.message)
          setLoading(false)
        })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (!response.ok) throw new Error('Failed to save settings')
      onRefresh()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }))
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(5px)'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', background: '#1a1d24' }}>
        <div className="header" style={{ marginBottom: '16px' }}>
          <h2 className="text-xl font-bold">Emergency Fund Setup</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <p className="text-danger text-sm">{error}</p>}
            
            <div>
              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
                Base Currency
              </label>
              <select
                name="base_currency"
                value={settings.base_currency || 'AED'}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
                Emergency Buffer Amount (in Base Currency)
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                name="emergency_buffer"
                value={settings.emergency_buffer === undefined ? '' : settings.emergency_buffer}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              />
              <p className="text-xs text-secondary mt-1" style={{ marginTop: '8px' }}>This amount is excluded when calculating funds available for your goals.</p>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button type="submit" className="btn icon-text" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                <span className="material-symbols-outlined">save</span>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
