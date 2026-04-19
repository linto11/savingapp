import React, { useState, useEffect } from 'react'

export default function TransactionModal({ isOpen, onClose, onRefresh, currency, initialType, initialData }) {
  const [type, setType] = useState(initialType || 'Income')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [accounts, setAccounts] = useState([])

  // Map backend raw format appropriately
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [txnCurrency, setTxnCurrency] = useState(currency || 'AED')
  const [targetDate, setTargetDate] = useState('')
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0])
  const [accountId, setAccountId] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [note, setNote] = useState('')

  const resetForm = () => {
    setName('')
    setAmount('')
    setTargetDate('')
    setTxnDate(new Date().toISOString().split('T')[0])
    setTxnCurrency(currency || 'AED')
    setAccountId('')
    setFromAccountId('')
    setToAccountId('')
    setNote('')
    setError(null)
  }

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/accounts')
      .then(res => res.json())
      .then(rows => setAccounts(rows || []))
      .catch(() => setAccounts([]))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || initialData || accounts.length === 0) return
    if ((type === 'Income' || type === 'Expense') && !accountId) {
      const defaultAccount = accounts.find(a => a.name === 'Linto - ENBD') || accounts[0]
      if (defaultAccount) {
        setAccountId(String(defaultAccount.id))
      }
    }
  }, [isOpen, initialData, accounts, type, accountId])

  useEffect(() => {
    if (!isOpen) return

    const activeType = initialType || 'Income'

    if (initialData) {
      setType(activeType)
      setError(null)

      if (activeType === 'Goal') {
        setName(initialData.name || '')
        setAmount(initialData.target_amount || '')
        setTargetDate(initialData.target_date ? initialData.target_date.split('T')[0] : '')
        setTxnCurrency(initialData.currency || currency)
      } else if (activeType === 'Account') {
        setName(initialData.name || '')
        setAmount(initialData.initial_balance || '')
        setTxnCurrency(initialData.currency || currency)
      } else if (activeType === 'Income') {
        setName(initialData.source || '')
        setAmount(initialData.amount || '')
        setTxnCurrency(initialData.currency || currency)
        setAccountId(initialData.account_id ? String(initialData.account_id) : '')
        setTxnDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0])
      } else if (activeType === 'Expense') {
        setName(initialData.category || '')
        setAmount(initialData.amount || '')
        setTxnCurrency(initialData.currency || currency)
        setAccountId(initialData.account_id ? String(initialData.account_id) : '')
        setTxnDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0])
      } else if (activeType === 'Transfer') {
        setAmount(initialData.amount || '')
        setTxnCurrency(initialData.currency || currency)
        setFromAccountId(initialData.from_account_id ? String(initialData.from_account_id) : '')
        setToAccountId(initialData.to_account_id ? String(initialData.to_account_id) : '')
        setNote(initialData.note || '')
        setTxnDate(initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0])
      }
    } else {
      setType(activeType)
      resetForm()
    }
  }, [isOpen, initialData, initialType, currency])

  if (!isOpen) return null

  // Helpers
  const getEndpoint = (t) => {
    switch (t) {
      case 'Income': return 'incomes'
      case 'Expense': return 'expenses'
      case 'Goal': return 'goals'
      case 'Account': return 'accounts'
      case 'Transfer': return 'transfers'
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
      payload = { source: name, amount: parseFloat(amount), currency: txnCurrency, frequency: 'monthly', date: isoDate, account_id: accountId ? parseInt(accountId, 10) : null }
    } else if (type === 'Expense') {
      let isoDate = txnDate ? new Date(txnDate).toISOString() : null
      payload = { category: name, amount: parseFloat(amount), currency: txnCurrency, frequency: 'monthly', date: isoDate, account_id: accountId ? parseInt(accountId, 10) : null }
    } else if (type === 'Goal') {
      let isoDate = null
      if (targetDate) {
        isoDate = new Date(targetDate).toISOString()
      }
      payload = { name: name, target_amount: parseFloat(amount), currency: txnCurrency, target_date: isoDate }
    } else if (type === 'Account') {
      payload = { name: name, country: 'Unknown', currency: txnCurrency, initial_balance: parseFloat(amount) }
    } else if (type === 'Transfer') {
      if (!fromAccountId || !toAccountId) {
        throw new Error('Both source and destination account are required')
      }
      if (fromAccountId === toAccountId) {
        throw new Error('Source and destination account must be different')
      }
      let isoDate = txnDate ? new Date(txnDate).toISOString() : null
      payload = {
        from_account_id: parseInt(fromAccountId, 10),
        to_account_id: parseInt(toAccountId, 10),
        amount: parseFloat(amount),
        currency: txnCurrency,
        date: isoDate,
        note: note || null,
      }
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
            {['Income', 'Expense', 'Goal', 'Account', 'Transfer'].map(t => (
              <button 
                key={t}
                type="button"
                onClick={() => {
                  setType(t)
                  resetForm()
                }}
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
              {type === 'Goal' ? 'Goal Name' : type === 'Account' ? 'Bank Name' : type === 'Expense' ? 'Category' : type === 'Transfer' ? 'Transfer Label' : 'Source'}
            </label>
            <input 
              required={type !== 'Transfer'}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'Transfer' ? 'Optional note title' : ''}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
            />
          </div>

          {(type === 'Income' || type === 'Expense') && (
            <div>
              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Bank Account</label>
              <select
                required
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              >
                <option value="">Select bank account</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
              <p className="text-xs text-secondary" style={{ marginTop: '6px' }}>
                This entry will update the selected account balance.
              </p>
            </div>
          )}

          {type === 'Transfer' && (
            <div>
              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>From Account</label>
              <select
                required
                value={fromAccountId}
                onChange={e => setFromAccountId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white', marginBottom: '12px' }}
              >
                <option value="">Select source account</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>

              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>To Account</label>
              <select
                required
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.5)', color: 'white' }}
              >
                <option value="">Select destination account</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>
              {type === 'Goal' ? 'Target Amount' : type === 'Account' ? 'Initial Balance' : type === 'Transfer' ? 'Transfer Amount' : 'Monthly Amount'}
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

          {(type === 'Income' || type === 'Expense' || type === 'Transfer') && (
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

          {type === 'Transfer' && (
            <div>
              <label className="text-sm text-secondary" style={{ display: 'block', marginBottom: '8px' }}>Note</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional"
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
