import React from 'react'
import GoalCard from '../components/GoalCard'

export default function Dashboard({ summaryData, onEdit }) {
  const { 
    currency, 
    initial_savings, 
    income_monthly, 
    expense_monthly, 
    net_savings_monthly, 
    goals,
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
      default: return 'list';
    }
  }

  const TransactionListCard = ({ title, type, items, formatter }) => (
    <div className="glass-card" style={{ marginBottom: '24px' }}>
      <h3 className="text-sm font-bold text-secondary icon-text" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <span className="material-symbols-outlined">{getIconForType(type)}</span>
        {title}
      </h3>
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
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <p className="font-bold text-sm">{formatter(item).value} <span className="text-xs text-secondary">{item.currency}</span></p>
                {(type === 'Income' || type === 'Expense') && (
                  <button 
                    className="icon-text"
                    onClick={() => { const cln = {...item}; delete cln.id; onEdit(type, cln); }} 
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                    Clone
                  </button>
                )}
                <button 
                  className="icon-text"
                  onClick={() => onEdit(type, item)} 
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="flow-container">
        <div className="flow-step">
          <h2 className="text-xl font-bold icon-text" style={{ marginBottom: '16px' }}><span className="material-symbols-outlined">payments</span> Income Master</h2>
          <p className="text-2xl font-bold text-success">+{income_monthly.toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-sm font-normal">{currency}</span></p>
        </div>
        <div className="text-secondary"><span className="material-symbols-outlined">arrow_forward</span></div>
        <div className="flow-step">
          <h2 className="text-xl font-bold icon-text" style={{ marginBottom: '16px' }}><span className="material-symbols-outlined">shopping_cart</span> Expense Master</h2>
          <p className="text-2xl font-bold text-danger">-{expense_monthly.toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-sm font-normal">{currency}</span></p>
        </div>
        <div className="text-secondary"><span className="material-symbols-outlined">arrow_forward</span></div>
        <div className="flow-step glass-card" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', margin: 0 }}>
          <p className="text-secondary text-sm icon-text" style={{marginBottom: '8px'}}>
            <span className="material-symbols-outlined">account_balance</span> Total Master Balance
          </p>
          <p className="text-2xl font-bold">{initial_savings.toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-sm font-normal">{currency}</span></p>
        </div>
        <div className="text-secondary"><span className="material-symbols-outlined">arrow_forward</span></div>
        <div className="flow-step glass-card" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '16px', margin: 0 }}>
          <p className="text-secondary text-sm icon-text" style={{marginBottom: '8px'}}>
            <span className="material-symbols-outlined">payments</span> Monthly Cash Flow
          </p>
          <p className="text-2xl font-bold">{net_savings_monthly.toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-sm font-normal">{currency}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 className="text-xl font-bold" style={{ marginBottom: '8px' }}>Your Financial Goals</h2>
            <p className="text-secondary text-sm">Initial base savings available: {initial_savings.toLocaleString(undefined, {maximumFractionDigits: 2})} {currency}</p>
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
            title="Linked Bank Accounts (Base Savings)" type="Account" items={raw_accounts} 
            formatter={(a) => ({ name: a.name, value: `${a.initial_balance}` })} 
          />
        </div>
      </div>
    </div>
  )
}
