import { useState, useEffect } from 'react'
import Dashboard from './views/Dashboard'
import Ledger from './views/Ledger'
import Forecast from './views/Forecast'
import TransactionModal from './components/TransactionModal'
import SettingsModal from './components/SettingsModal'
import { apiFetch, getApiBaseUrl, isApiConfigured } from './lib/api'
import './index.css'

function getDefaultForecastDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().split('T')[0]
}

function getForecastMonths(dateString) {
  const today = new Date()
  const selected = new Date(dateString)

  if (Number.isNaN(selected.getTime())) {
    return 12
  }

  let months = ((selected.getFullYear() - today.getFullYear()) * 12) + (selected.getMonth() - today.getMonth())
  if (selected.getDate() >= today.getDate()) {
    months += 1
  }

  return Math.max(months, 12)
}

function App() {
  const [data, setData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbStatus, setDbStatus] = useState({
    active_provider: 'sqlite',
    sync_enabled: false,
    in_sync: false,
    reason: 'Checking database status...',
  })
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [modalType, setModalType] = useState('Income')
  const [modalInitialData, setModalInitialData] = useState(null)
  
  const [baseCurrency, setBaseCurrency] = useState('AED')
  const [selectedForecastDate, setSelectedForecastDate] = useState(getDefaultForecastDate())

  useEffect(() => {
    if (!isApiConfigured()) {
      setDbStatus(prev => ({
        ...prev,
        reason: 'Backend API URL is not configured yet for this deployed app.',
      }))
      setIsSettingsOpen(true)
      return
    }

    apiFetch('/settings')
      .then(res => res.json())
      .then(settings => {
        if (settings?.base_currency) {
          setBaseCurrency(settings.base_currency)
        }
        setDbStatus(prev => ({
          ...prev,
          active_provider: settings?.database_provider_active || 'sqlite',
          sync_enabled: Boolean(settings?.sync_to_supabase),
        }))
        if (!settings?.database_choice_confirmed) {
          setIsSettingsOpen(true)
        }
      })
      .catch(() => {
        setDbStatus(prev => ({
          ...prev,
          reason: 'Backend API is not reachable. Open Settings and add your hosted backend URL.',
        }))
        setIsSettingsOpen(true)
      })
  }, [])

  const fetchDashboard = () => {
    setLoading(true)
    const forecastMonths = getForecastMonths(selectedForecastDate)

    Promise.allSettled([
      apiFetch(`/dashboard/summary?target_currency=${baseCurrency}`).then(res => {
        if (!res.ok) throw new Error('Failed to load dashboard summary')
        return res.json()
      }),
      apiFetch(`/forecast/projection?target_currency=${baseCurrency}&months_ahead=${forecastMonths}&selected_date=${selectedForecastDate}`).then(res => {
        if (!res.ok) throw new Error('Failed to load forecast projection')
        return res.json()
      }),
      apiFetch('/settings/sync-status').then(res => {
        if (!res.ok) throw new Error('Failed to load database sync status')
        return res.json()
      })
    ])
      .then(([summaryResult, forecastResult, syncResult]) => {
        if (summaryResult.status === 'fulfilled') {
          setData(summaryResult.value)
        } else {
          console.error(summaryResult.reason)
          setData(null)
        }

        if (forecastResult.status === 'fulfilled') {
          setForecastData(forecastResult.value)
        } else {
          console.error(forecastResult.reason)
          setForecastData(null)
        }

        if (syncResult.status === 'fulfilled') {
          setDbStatus(syncResult.value)
        } else {
          console.error(syncResult.reason)
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchDashboard()
  }, [baseCurrency, selectedForecastDate])

  const handleOpenAddNew = () => {
    setModalType('Income')
    setModalInitialData(null)
    setIsModalOpen(true)
  }

  const handleEdit = (type, item) => {
    if (type === 'EmergencyBuffer') {
      setIsSettingsOpen(true)
      return
    }
    setModalType(type)
    setModalInitialData(item)
    setIsModalOpen(true)
  }

  const [activeTab, setActiveTab] = useState('dashboard')

  if (loading) return <div className="app-container">Loading...</div>

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1 className="text-2xl font-bold">Savings Planner</h1>
          <p className="text-secondary text-sm">Joint Household View</p>
          <div className="status-pill-row">
            <span className={`status-pill ${dbStatus.active_provider === 'supabase' ? 'status-pill-success' : 'status-pill-info'}`}>
              {dbStatus.active_provider === 'supabase' ? 'Connected to Supabase' : 'Connected to SQLite'}
            </span>
            <span className={`status-pill ${dbStatus.in_sync ? 'status-pill-success' : dbStatus.sync_enabled ? 'status-pill-warning' : 'status-pill-muted'}`}>
              {dbStatus.sync_enabled ? (dbStatus.in_sync ? 'Sync OK' : 'Sync needs setup') : 'Sync off'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <select 
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'white' }}
          >
            <option value="AED">Display in AED</option>
            <option value="USD">Display in USD</option>
            <option value="INR">Display in INR</option>
          </select>
          <button className="btn icon-text" onClick={() => setIsSettingsOpen(true)}>
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{ background: 'none', border: 'none', color: activeTab === 'dashboard' ? 'var(--accent-color)' : 'var(--secondary-color)', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', borderBottom: activeTab === 'dashboard' ? '2px solid var(--accent-color)' : 'none', paddingBottom: '12px', marginBottom: '-14px', transition: '0.2s' }}
          className="icon-text hover:text-white"
        >
          <span className="material-symbols-outlined">dashboard</span> Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('ledger')}
          style={{ background: 'none', border: 'none', color: activeTab === 'ledger' ? 'var(--accent-color)' : 'var(--secondary-color)', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', borderBottom: activeTab === 'ledger' ? '2px solid var(--accent-color)' : 'none', paddingBottom: '12px', marginBottom: '-14px', transition: '0.2s' }}
          className="icon-text hover:text-white"
        >
          <span className="material-symbols-outlined">receipt_long</span> Monthly Ledger
        </button>
        <button 
          onClick={() => setActiveTab('forecast')}
          style={{ background: 'none', border: 'none', color: activeTab === 'forecast' ? 'var(--accent-color)' : 'var(--secondary-color)', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', borderBottom: activeTab === 'forecast' ? '2px solid var(--accent-color)' : 'none', paddingBottom: '12px', marginBottom: '-14px', transition: '0.2s' }}
          className="icon-text hover:text-white"
        >
          <span className="material-symbols-outlined">insights</span> Forecast
        </button>
      </nav>

      {data ? (
        activeTab === 'dashboard' ? (
          <Dashboard summaryData={data} onEdit={handleEdit} />
        ) : activeTab === 'ledger' ? (
          <Ledger summaryData={data} onEdit={handleEdit} onAddNew={handleOpenAddNew} currency={baseCurrency} />
        ) : (
          <Forecast 
            forecastData={forecastData}
            selectedDate={selectedForecastDate}
            onSelectedDateChange={setSelectedForecastDate}
          />
        )
      ) : (
        <div className="glass-card">
          <p>No dashboard data reachable.</p>
          <p className="text-sm text-secondary" style={{ marginTop: '8px' }}>
            If this site is on Netlify, set the VITE_API_BASE_URL environment variable to your hosted FastAPI backend URL.
          </p>
          <p className="text-xs text-secondary" style={{ marginTop: '6px' }}>
            Current API target: {getApiBaseUrl() || 'Not configured yet'}
          </p>
        </div>
      )}

      {isModalOpen && (
        <TransactionModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchDashboard}
          currency={baseCurrency}
          initialType={modalType}
          initialData={modalInitialData}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onRefresh={fetchDashboard}
        />
      )}
    </div>
  )
}

export default App
