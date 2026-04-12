import { useState, useEffect } from 'react'
import Dashboard from './views/Dashboard'
import Ledger from './views/Ledger'
import TransactionModal from './components/TransactionModal'
import SettingsModal from './components/SettingsModal'
import './index.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [modalType, setModalType] = useState('Income')
  const [modalInitialData, setModalInitialData] = useState(null)
  
  const [baseCurrency, setBaseCurrency] = useState('AED')

  const fetchDashboard = () => {
    fetch(`/api/dashboard/summary?target_currency=${baseCurrency}`)
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchDashboard()
  }, [baseCurrency])

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
      </nav>

      {data ? (
        activeTab === 'dashboard' ? (
          <Dashboard summaryData={data} onEdit={handleEdit} />
        ) : (
          <Ledger summaryData={data} onEdit={handleEdit} onAddNew={handleOpenAddNew} currency={baseCurrency} />
        )
      ) : (
        <p>No dashboard data reachable. Ensure backend is running.</p>
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
