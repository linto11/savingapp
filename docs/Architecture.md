# System Architecture

The Multi-Currency Savings App runs on a strict decoupled architecture mapping React States directly to SQLAlchemy records.

## Component Breakdown

### 1. Database (SQLite via SQLAlchemy)
- Resides purely locally.
- Protected from dropping elements via restrictive `ALTER TABLE` upgrades in backend lifecycles.
- Contains 4 Core Master tables: `Account`, `Income`, `Expense`, and `Goal`. 

### 2. The Python FastAPI Backend
- Acts as a pure calculation server.
- Intercepts all REST calls from the Frontend UI.
- Contains a globally active `/dashboard/summary` endpoint that maps thousands of inputs into aggregated variables.
- Houses the mathematical **Waterfall Sequence Algorithm** which physically cascades the user's Net Savings Pool (`Total Bank + Total Income - Total Expense`) down a chronologically-sorted list of Goal Targets.

### 3. The React/Vite Frontend
- Acts purely as an interactive dashboard. 
- Performs ZERO mathematical calculations. Absolutely all currency conversions and goal pending equations are physically handed to it by FastAPI.
- Relies exclusively on `useState` variables in the Root Layer to handle Native UI Routing (e.g. Toggling from Dashboard to the Accordion Ledger block).

### 4. Rule Protections
1. All mathematical conversions lock safely utilizing `.toLocaleString({maximumFractionDigits: 2})` natively.
2. The Database is mathematically locked strictly to `savings.db`. 

Because of this decoupled nature, the entire Python API server can be moved to a remote Docker instance without making any severe changes to the Frontend stack aside from a single root Domain URL update.
