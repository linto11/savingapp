import React, { useState, useEffect } from 'react'
import { apiFetch, getApiBaseUrl, setApiBaseUrl, LOCAL_BACKEND_URL, RENDER_BACKEND_URL } from '../lib/api'

const EMPTY_SETTINGS = {
  base_currency: 'AED',
  emergency_buffer: 50000,
  database_mode: 'sqlite',
  sync_to_supabase: false,
  supabase_project_url: '',
  supabase_db_host: '',
  supabase_db_user: 'postgres',
  supabase_db_name: 'postgres',
  supabase_db_port: 5432,
}

export default function SettingsModal({ isOpen, onClose, onRefresh }) {
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [syncStatus, setSyncStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [backendUrl, setBackendUrl] = useState('')
  const [error, setError] = useState(null)

  const loadSettingsData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [settingsResponse, syncResponse] = await Promise.all([
        apiFetch('/settings'),
        apiFetch('/settings/sync-status'),
      ])

      if (!settingsResponse.ok) {
        throw new Error('Could not reach backend settings service')
      }

      const data = await settingsResponse.json()
      const status = syncResponse.ok ? await syncResponse.json() : null
      setSettings({ ...EMPTY_SETTINGS, ...(data || {}) })
      setSyncStatus(status)
    } catch {
      setSettings(EMPTY_SETTINGS)
      setSyncStatus(null)
      setError('Backend is not reachable from this Netlify site yet. Paste your hosted backend URL below, then try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const currentBase = getApiBaseUrl()
      setBackendUrl(currentBase === '/api' ? '' : currentBase)
      loadSettingsData()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleApplyBackendUrl = async () => {
    setTestingConnection(true)
    setError(null)

    try {
      setApiBaseUrl(backendUrl)
      await loadSettingsData()
      onRefresh?.()
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await apiFetch('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail || 'Failed to save settings')

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
      <div className="glass-card" style={{ width: '100%', maxWidth: '520px', background: '#1a1d24' }}>
        <div className="header" style={{ marginBottom: '16px' }}>
          <h2 className="text-xl font-bold">App & Database Setup</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <p className="text-danger text-sm">{error}</p>}

            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>
              <div className="text-sm" style={{ fontWeight: 600, marginBottom: '6px' }}>
                Backend API Connection
              </div>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://your-backend-host.com"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              />
              <p className="text-xs text-secondary" style={{ marginTop: '8px' }}>
                This saved URL is reused across your local and hosted app sessions on this device.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setBackendUrl(LOCAL_BACKEND_URL)}>
                  Use local backend
                </button>
                <button type="button" className="btn" onClick={() => setBackendUrl(RENDER_BACKEND_URL)}>
                  Use Render backend
                </button>
                <button type="button" className="btn" onClick={handleApplyBackendUrl} disabled={testingConnection}>
                  {testingConnection ? 'Connecting...' : 'Apply connection'}
                </button>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>
              <div className="text-sm" style={{ fontWeight: 600, marginBottom: '6px' }}>
                Current Database Status
              </div>
              <p className="text-xs text-secondary">
                Active provider: {syncStatus?.active_provider === 'supabase' ? 'Supabase' : 'SQLite'}
              </p>
              <p className="text-xs text-secondary" style={{ marginTop: '4px' }}>
                Sync state: {syncStatus?.sync_enabled ? (syncStatus?.in_sync ? 'In sync' : 'Not synced yet') : 'Disabled'}
              </p>
              {syncStatus?.reason && (
                <p className="text-xs text-secondary" style={{ marginTop: '4px' }}>
                  {syncStatus.reason}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
                Data Source
              </label>
              <select
                name="database_mode"
                value={settings.database_mode || 'sqlite'}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              >
                <option value="sqlite">SQLite (Local device)</option>
                <option value="supabase">Supabase Postgres</option>
              </select>
              <p className="text-xs text-secondary" style={{ marginTop: '8px' }}>
                Active connection: {settings.database_provider_active === 'supabase' ? 'Supabase' : 'SQLite'}
              </p>
            </div>

            {(settings.database_mode === 'supabase' || settings.sync_to_supabase) && (
              <>
                <div>
                  <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={settings.supabase_project_url || ''}
                    readOnly
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.35)', color: 'white' }}
                  />
                  <p className="text-xs text-secondary" style={{ marginTop: '8px' }}>
                    Pooler host: {settings.supabase_db_host || 'aws-1-ap-northeast-1.pooler.supabase.com'}
                  </p>
                  <p className="text-xs text-secondary" style={{ marginTop: '4px' }}>
                    Database user: {settings.supabase_db_user || 'postgres.vtflzxqdvmodpbeonfue'}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
                    Supabase Publishable Key
                  </label>
                  <input
                    type="password"
                    name="supabase_api_key"
                    value={settings.supabase_api_key || ''}
                    onChange={handleChange}
                    placeholder={settings.supabase_key_saved ? 'Already entered for this session — enter only to update it' : 'Enter your Supabase publishable key'}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                  />
                </div>

                <div>
                  <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
                    Supabase DB Password
                  </label>
                  <input
                    type="password"
                    name="supabase_db_password"
                    value={settings.supabase_db_password || ''}
                    onChange={handleChange}
                    placeholder={settings.supabase_password_saved ? 'Already entered for this session — enter only to update it' : 'Enter your Postgres password'}
                    required={!settings.supabase_password_saved && !settings.supabase_connection_string}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                  />
                  <p className="text-xs text-secondary" style={{ marginTop: '8px' }}>
                    These values are used only for the current session and are not written to repository files.
                  </p>
                </div>
              </>
            )}

            {settings.database_mode === 'sqlite' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  name="sync_to_supabase"
                  checked={Boolean(settings.sync_to_supabase)}
                  onChange={(e) => setSettings(prev => ({ ...prev, sync_to_supabase: e.target.checked }))}
                />
                <span className="text-sm">Keep local SQLite mirrored to Supabase for hosted use (one-way sync)</span>
              </label>
            )}
            
            {(settings.database_mode === 'supabase' || settings.sync_to_supabase) && (
              <div>
                <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
                  Supabase Connection String (optional, recommended for Netlify/pooler)
                </label>
                <input
                  type="password"
                  name="supabase_connection_string"
                  value={settings.supabase_connection_string || ''}
                  onChange={handleChange}
                  placeholder="Paste the Supabase pooler or Postgres connection string"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
                />
                <p className="text-xs text-secondary" style={{ marginTop: '8px' }}>
                  This is the best option for Netlify or networks where the direct database host is restricted.
                </p>
              </div>
            )}

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
