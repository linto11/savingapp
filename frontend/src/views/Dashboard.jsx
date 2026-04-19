import React from 'react'
import GoalCard from '../components/GoalCard'

export default function Dashboard({ summaryData, onEdit }) {
  const { 
    currency, 
    initial_savings, 
    emergency_buffer = 0,
    available_for_goals = Math.max(initial_savings - emergency_buffer, 0),
    income_monthly, 
    expense_monthly, 
    net_savings_monthly, 
    goals,
    master_income_total = 0,
    master_expense_total = 0,
    raw_incomes = [],
    raw_expenses = [],
    raw_accounts = [],
    raw_goals = []
  } = summaryData

  // Mapped lists to edit
  const getIconForType = (t) => {
    switch (t) {
      case 'Income': return 'trending_up';
      case 'Expense': return 'trending_down';
      case 'Account': return 'savings';
      case 'EmergencyBuffer': return 'health_and_safety';
      default: return 'list';
    }
  }

  const TransactionListCard = ({ title, type, items, formatter }) => (
    <div className="glass-card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <h3 className="text-sm font-bold text-secondary icon-text">
          <span className="material-symbols-outlined">{getIconForType(type)}</span>
          {title}
        </h3>
        {(type === 'Income' || type === 'Expense') && (
          <button 
            className="icon-text"
            title="Add New"
            onClick={() => onEdit(type, null)} 
            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--accent-color)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-secondary text-sm">No entries yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => (
            <div 
              key={item.id} 
              style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}
            >
              <div>
                <p className="font-semibold text-sm">{formatter(item).name}</p>
                {formatter(item).secondary && (
                  <p className="text-xs text-secondary" style={{ marginTop: '4px' }}>{formatter(item).secondary}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <p className="font-bold text-sm" style={{ color: type === 'Expense' ? 'var(--danger-color)' : 'inherit', whiteSpace: 'nowrap' }}>
                  {formatter(item).value} <span className="text-xs" style={{ color: 'var(--secondary-color)' }}>{item.currency}</span>
                </p>
                {(type === 'Income' || type === 'Expense') && (
                  <button 
                    className="icon-text"
                    title="Clone to Ledger"
                    onClick={() => { const cln = {...item}; delete cln.id; onEdit(type, cln); }} 
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                  </button>
                )}
                <button 
                  className="icon-text"
                  title="Edit Master"
                  onClick={() => onEdit(type, item)} 
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {items.length > 0 && (type === 'Income' || type === 'Expense') && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
          <p className="text-sm font-bold">Total</p>
          <p className="text-sm font-bold" style={{ color: type === 'Expense' ? 'var(--danger-color)' : 'var(--success-color)', whiteSpace: 'nowrap' }}>
            {type === 'Expense' ? '-' : '+'}{(type === 'Income' ? master_income_total : master_expense_total).toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-xs" style={{ color: 'var(--secondary-color)' }}>{currency}</span>
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="dashboard-summary">
        <div className="glass-card summary-panel">
          <div className="summary-heading">
            <h2 className="text-lg font-bold">Cash Flow Snapshot</h2>
            <p className="text-sm text-secondary">Monthly movement at a glance</p>
          </div>
          <div className="summary-metrics">
            <div className="summary-metric">
              <p className="summary-label text-secondary icon-text"><span className="material-symbols-outlined">payments</span> Income</p>
              <p className="summary-value text-success">+{income_monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal">{currency}</span></p>
            </div>
            <div className="summary-metric">
              <p className="summary-label text-secondary icon-text"><span className="material-symbols-outlined">shopping_cart</span> Expense</p>
              <p className="summary-value text-danger">-{expense_monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal">{currency}</span></p>
            </div>
            <div className="summary-metric">
              <p className="summary-label text-secondary icon-text"><span className="material-symbols-outlined">monitoring</span> Net Cash Flow</p>
              <p className="summary-value">{net_savings_monthly.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal">{currency}</span></p>
            </div>
          </div>
        </div>

        <div className="glass-card summary-panel">
          <div className="summary-heading">
            <h2 className="text-lg font-bold">Savings & Goal Buffer</h2>
            <p className="text-sm text-secondary">Reserved cash and what remains for planning</p>
          </div>
          <div className="summary-metrics">
            <div className="summary-metric">
              <p className="summary-label text-secondary icon-text"><span className="material-symbols-outlined">account_balance</span> Total Balance</p>
              <p className="summary-value">{initial_savings.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal">{currency}</span></p>
            </div>
            <div className="summary-metric">
              <p className="summary-label text-secondary icon-text"><span className="material-symbols-outlined">health_and_safety</span> Emergency Fund</p>
              <p className="summary-value" style={{ color: 'var(--warning-color, #fbbf24)' }}>{emergency_buffer.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal">{currency}</span></p>
            </div>
            <div className="summary-metric">
              <p className="summary-label text-secondary icon-text"><span className="material-symbols-outlined">flag</span> Available for Goals</p>
              <p className="summary-value text-success">{available_for_goals.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-normal">{currency}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 className="text-xl font-bold" style={{ marginBottom: '8px' }}>Your Financial Goals</h2>
            <p className="text-secondary text-sm">
              Savings available after emergency fund: <span style={{ whiteSpace: 'nowrap' }}>{available_for_goals.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</span>
            </p>
          </div>
          
          <div className="grid grid-cols-1">
            {goals.map(g => (
              <GoalCard 
                key={g.id} 
                goal={g} 
                currency={currency} 
                netSavings={net_savings_monthly}
                onEdit={() => onEdit('Goal', raw_goals.find(rg => rg.id === g.id))}
              />
            ))}
          </div>
        </div>

        <div>
          <TransactionListCard 
            title="Income Master" type="Income" items={raw_incomes} 
            formatter={(i) => ({ name: i.source, value: `+${i.amount}` })} 
          />
          <TransactionListCard 
            title="Expense Master" type="Expense" items={raw_expenses} 
            formatter={(e) => ({ name: e.category, value: `-${e.amount}` })} 
          />
          <TransactionListCard 
            title="Linked Bank Accounts (Current Balances)" type="Account" items={raw_accounts} 
            formatter={(a) => ({ 
              name: a.name,
              value: `${(a.current_balance ?? a.initial_balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
              secondary: `Opening balance: ${a.initial_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${a.currency}`
            })} 
          />
          <TransactionListCard 
            title="Emergency Fund Master" type="EmergencyBuffer" items={[{ id: 'emergency_buffer', value: emergency_buffer, currency: currency, name: 'Designated Cash Buffer' }]} 
            formatter={(s) => ({ name: s.name, value: `${s.value}` })} 
          />
        </div>
      </div>
    </div>
  )
}
