import React, { useMemo, useState } from 'react'

export default function Ledger({ summaryData, onEdit, onAddNew, currency }) {
  const { ledger_incomes = [], ledger_expenses = [] } = summaryData
  
  const currentYear = new Date().getFullYear().toString()
  const [expandedYears, setExpandedYears] = useState({ [currentYear]: true })
  const [collapsedMonths, setCollapsedMonths] = useState({})

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }))
  }

  const toggleMonth = (monthKey) => {
    setCollapsedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }))
  }

  const groupedByYearAndMonth = useMemo(() => {
    const years = {}

    const processItem = (item, type) => {
      const dateStr = item.date.split('T')[0]
      const year = dateStr.substring(0, 4) // "YYYY"
      const month = dateStr.substring(5, 7) // "MM"
      
      if (!years[year]) years[year] = { totalIncome: 0, totalExpense: 0, months: {} }
      if (!years[year].months[month]) {
        years[year].months[month] = {
          label: new Date(`${year}-${month}-02T00:00:00Z`).toLocaleDateString(undefined, { month: 'long' }),
          incomes: [],
          expenses: []
        }
      }

      if (type === 'Income') {
        years[year].months[month].incomes.push(item)
        years[year].totalIncome += item.amount
      } else {
        years[year].months[month].expenses.push(item)
        years[year].totalExpense += item.amount
      }
    }

    ledger_incomes.forEach(i => processItem(i, 'Income'))
    ledger_expenses.forEach(e => processItem(e, 'Expense'))

    return Object.entries(years).sort(([a], [b]) => b.localeCompare(a)).map(([year, yearData]) => ({
      year,
      totalIncome: yearData.totalIncome,
      totalExpense: yearData.totalExpense,
      months: Object.entries(yearData.months).sort(([a], [b]) => b.localeCompare(a)).map(([m, mData]) => mData)
    }))
  }, [ledger_incomes, ledger_expenses])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="text-xl font-bold icon-text">
          <span className="material-symbols-outlined">receipt_long</span> Yearly Ledger
        </h2>
        <button className="btn icon-text" onClick={onAddNew}>
          <span className="material-symbols-outlined">add_circle</span>
          Add Transaction
        </button>
      </div>
      <p className="text-secondary text-sm" style={{ marginBottom: '24px' }}>
        A strictly unsimulated breakdown of exact incomes and expenses organizing your cash flow reality.
      </p>

      {groupedByYearAndMonth.length === 0 ? (
        <p className="text-secondary">No historical transactions logged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {groupedByYearAndMonth.map((yearGroup) => (
            <div key={yearGroup.year} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Year Accordion Header */}
              <div 
                onClick={() => toggleYear(yearGroup.year)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)' }}
              >
                <h3 className="text-xl font-bold icon-text">
                  <span className="material-symbols-outlined">{expandedYears[yearGroup.year] ? 'folder_open' : 'folder'}</span>
                  Year {yearGroup.year}
                </h3>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary-color)', transition: '0.3s', transform: expandedYears[yearGroup.year] ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
                </div>
              </div>

              {/* Month Blocks inside Year */}
              {expandedYears[yearGroup.year] && (
                <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {yearGroup.months.map((monthData, idx) => {
                    const monthKey = `${yearGroup.year}-${monthData.label}`
                    const isCollapsed = collapsedMonths[monthKey]
                    return (
                    <div key={idx} style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                      <div 
                        onClick={() => toggleMonth(monthKey)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)', paddingBottom: isCollapsed ? '0' : '12px', marginBottom: isCollapsed ? '0' : '16px' }}
                      >
                        <h4 className="text-lg font-bold icon-text">
                          <span className="material-symbols-outlined">calendar_month</span> {monthData.label}
                        </h4>
                        <span className="material-symbols-outlined" style={{ color: 'var(--secondary-color)', transition: '0.3s', transform: !isCollapsed ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
                      </div>

                      {!isCollapsed && (
                      <div className="grid grid-cols-2" style={{ gap: '24px' }}>
                        {/* INCOMES */}
                        <div>
                          <h5 className="text-sm font-bold icon-text text-success" style={{ marginBottom: '12px' }}>
                            <span className="material-symbols-outlined">trending_up</span> Incomes
                          </h5>
                          {monthData.incomes.length === 0 ? <p className="text-xs text-secondary">None</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {monthData.incomes.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                  <div>
                                    <p className="text-sm">{item.source || item.name}</p>
                                    <p className="text-xs text-secondary">{item.date ? item.date.split('T')[0] : 'No Date'}</p>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <p className="text-sm font-semibold text-success">+{item.amount.toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-xs text-secondary">{item.currency}</span></p>
                                    <button className="icon-text" onClick={() => { const cln = {...item}; delete cln.id; onEdit('Income', cln); }} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span></button>
                                    <button className="icon-text" onClick={() => onEdit('Income', item)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* EXPENSES */}
                        <div>
                          <h5 className="text-sm font-bold icon-text text-danger" style={{ marginBottom: '12px' }}>
                            <span className="material-symbols-outlined">trending_down</span> Expenses
                          </h5>
                          {monthData.expenses.length === 0 ? <p className="text-xs text-secondary">None</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {monthData.expenses.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                  <div>
                                    <p className="text-sm">{item.category}</p>
                                    <p className="text-xs text-secondary">{item.date ? item.date.split('T')[0] : 'No Date'}</p>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <p className="text-sm font-semibold text-danger">-{item.amount.toLocaleString(undefined, {maximumFractionDigits: 2})} <span className="text-xs text-secondary">{item.currency}</span></p>
                                    <button className="icon-text" onClick={() => { const cln = {...item}; delete cln.id; onEdit('Expense', cln); }} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span></button>
                                    <button className="icon-text" onClick={() => onEdit('Expense', item)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
