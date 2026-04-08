# Multi-Currency Savings Ledger

A robust, real-time financial tracking application powered by a FastAPI Python backend and a React (Vite) frontend. The application features a dynamic Goal Waterfall engine, chronological native Master Ledgers, and strict multi-currency algorithmic rounding to effectively track offline wealth accumulation.

## Project Structure

This project uses a separated Frontend/Backend architecture:
- `backend/` - Python FastAPI server utilizing an SQLite database via SQLAlchemy.
- `frontend/` - React frontend powered by Vite, explicitly engineered for native tabbed state-routing.
- `docs/` - Contains deeper system documentation and database architecture overviews.

## Prerequisites

To run this application locally on your machine, you must have the following installed:
1. **Node.js**: `v18.0` or higher (to run the React Frontend)
2. **Python**: `v3.10` or higher (to run the FastAPI Backend)
3. **Git**: To clone the repository

---

## Local Setup & Run Instructions

### 1. Backend Setup

The backend serves as the SQL Engine and the mathematical core.

1. Open a terminal and navigate strictly to the root folder of this repository.
2. Create a virtual environment to isolate the Python packages:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   - **Windows:** `.\.venv\Scripts\Activate.ps1`
   - **Mac/Linux:** `source .venv/bin/activate`
4. Install the required dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic
   ```
5. Boot the server using Uvicorn (this will run on port `8000`):
   ```bash
   uvicorn backend.main:app --port 8000 --reload
   ```

*(The backend must remain running in this terminal window).*

### 2. Frontend Setup

The frontend serves the UI/UX dashboard. Open a **brand new** secondary terminal window.

1. Navigate strictly into the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install all the React packages and UI dependencies:
   ```bash
   npm install
   ```
3. Boot the Vite development server:
   ```bash
   npm run dev
   ```

A localhost link (usually `http://localhost:5173/`) will appear in your terminal. Click it to open your application!

## Disclaimer

The backend explicitly protects the `.gitignore` from uploading your `savings.db` and large cache folders to Git in order to protect your financial footprint. It will generate a completely fresh `.db` file locally whenever it boots up on a new PC.
