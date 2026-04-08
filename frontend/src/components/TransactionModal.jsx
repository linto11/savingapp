import React, { useState, useEffect } from 'react'

export default function TransactionModal({ isOpen, onClose, onRefresh, currency, initialType, initialData }) {
  const [type, setType] = useState(initialType || 'Income')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Map backend raw format appropriately
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [txnCurrency, setTxnCurrency] = useState(currency || 'AED')
  const [targetDate, setTargetDate] = useState('')
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (initialData) {
      if (type === 'Goal') {
        setName(initialData.name || '')
        setAmount(initialData.target_amount || '')
        
        if (initialData.target_date) {
            setTargetDate(initialData.target_date.split('T')[0])
        } else {
            setTargetDate('')
        }
        setTxnCurrency(initialData.currency || currency)
      } else if (type === 'Account') {
        setName(initialData.name || '')
        setAmount(initialData.initial_balance || '')
        setTxnCurrency(initialData.currency || currency)
      } else if (type === 'Income') {
        setName(initialData.source || '')
        setAmount(initialData.amount || '')
        setTxnCurrency(initialData.currency || currency)
        if (initialData.date) {
            setTxnDate(initialData.date.split('T')[0])
        }
      } else if (type === 'Expense') {
        setName(initialData.category || '')
        setAmount(initialData.amount || '')
        setTxnCurrency(initialData.currency || currency)
        if (initialData.date) {
            setTxnDate(initialData.date.split('T')[0])
        }
      }
    } else {
      setType(initialType || 'Income')
      // Reset forms
      setName('')
      setAmount('')
      setTargetDate('')
      setTxnDate(new Date().toISOString().split('T')[0])
      setTxnCurrency(currency || 'AED')
    }
  }, [initialData, initialType, currency])

  if (!isOpen) return null

  // Helpers
  const getEndpoint = (t) => {
    switch (t) {
      case 'Income': return 'incomes'
      case 'Expense': return 'expenses'
      case 'Goal': return 'goals'
      case 'Account': return 'accounts'
      default: return 'incomes'
    }
  }

  const handleDelete = async () => {
    if (!initialData || !initialData.id) return
    const isConfirm = window.confirm(`Are you sure you want to delete this ${type}?`)
    if(!isConfirm) return
    
    setLoading(true)
    try {
      const ep = getEndpoint(type)
      const response = await fetch(`/api/${ep}/${initialData.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error("Failed to delete transaction")
      onRefresh()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    let ep = getEndpoint(type)
    let payload = {}

    if (type === 'Income') {
      let isoDate = txnDate ? new Date(txnDate).toISOString() : null
      payload = { source: name, amount: parseFloat(amount), currency: txnCurrency, frequency: 'monthly', date: isoDate }
    } else if (type === 'Expense') {
      let isoDate = txnDate ? new Date(txnDate).toISOString() : null
      payload = { category: name, amount: parseFloat(amount), currency: txnCurrency, frequency: 'monthly', date: isoDate }
    } else if (type === 'Goal') {
      let isoDate = null
      if (targetDate) {
        isoDate = new Date(targetDate).toISOString()
      }
      payload = { name: name, target_amount: parseFloat(amount), currency: txnCurrency, target_date: isoDate }
    } else if (type === 'Account') {
      payload = { name: name, country: 'Unknown', currency: txnCurrency, initial_balance: parseFloat(amount) }
    }

    try {
      const isEdit = initialData && initialData.id
      const url = `/api/${ep}` + (isEdit ? `/${initialData.id}` : '')
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error(`Failed to save ${type}`)
      
      onRefresh()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(5px)'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', background: '#1a1d24' }}>
        <div className="header" style={{ marginBottom: '16px' }}>
          <h2 className="text-xl font-bold">{initialData ? 'Edit Entry' : 'Add New Entry'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
        </div>

        {!initialData && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {['Income', 'Expense', 'Goal', 'Account'].map(t => (
              <button 
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '4px', border: 'none',
                  background: type === t ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                  color: 'white', cursor: 'pointer'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {initialData && (
          <p className="text-sm text-secondary" style={{marginBottom: '16px'}}>Editing {type}</p>
        )}

        {error && <p className="text-danger text-sm" style={{ marginBottom: '16px' }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
              {type === 'Goal' ? 'Goal Name' : type === 'Account' ? 'Bank Name' : type === 'Expense' ? 'Category' : 'Source'}
            </label>
            <input 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
            />
          </div>

          <div>
            <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
              {type === 'Goal' ? 'Target Amount' : type === 'Account' ? 'Initial Balance' : 'Monthly Amount'}
            </label>
            <input 
              required type="number" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
            />
          </div>

          <div>
            <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Currency</label>
            <select 
              value={txnCurrency}
              onChange={e => setTxnCurrency(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
            >
              <option value="AED">AED</option>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
            </select>
          </div>

          {(type === 'Income' || type === 'Expense') && (
            <div>
              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Date</label>
              <input 
                required type="date"
                value={txnDate}
                onChange={e => setTxnDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              />
            </div>
          )}

          {type === 'Goal' && (
            <div>
              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Target Date</label>
              <input 
                required type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" className="btn icon-text" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              <span className="material-symbols-outlined">save</span>
              {loading ? 'Saving...' : 'Save'}
            </button>
            {initialData && (
              <button type="button" className="btn icon-text" onClick={handleDelete} disabled={loading} style={{ background: 'var(--danger-color)', justifyContent: 'center' }}>
                <span className="material-symbols-outlined">delete</span>
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
