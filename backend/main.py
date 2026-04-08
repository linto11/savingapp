from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from . import models, schemas, config
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Savings App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# A simple user placeholder since we are not doing full JWT in this stub
# Ideally we would get the current user from auth token
def get_current_user(db: Session = Depends(get_db)):
    # just return first user for stub
    user = db.query(models.User).first()
    if not user:
        user = models.User(username="demo", password="password")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@app.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(username=user.username, password=user.password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/accounts", response_model=list[schemas.Account])
def get_accounts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Account).filter(models.Account.user_id == current_user.id).all()

@app.post("/accounts", response_model=schemas.Account)
def create_account(account: schemas.AccountCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_account = models.Account(**account.model_dump(), user_id=current_user.id)
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@app.get("/incomes", response_model=list[schemas.Income])
def get_incomes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Income).filter(models.Income.user_id == current_user.id).all()

@app.post("/incomes", response_model=schemas.Income)
def create_income(income: schemas.IncomeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_income = models.Income(**income.model_dump(), user_id=current_user.id)
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income

@app.get("/expenses", response_model=list[schemas.Expense])
def get_expenses(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Expense).filter(models.Expense.user_id == current_user.id).all()

@app.post("/expenses", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_expense = models.Expense(**expense.model_dump(), user_id=current_user.id)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.get("/goals", response_model=list[schemas.Goal])
def get_goals(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()

@app.post("/goals", response_model=schemas.Goal)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_goal = models.Goal(**goal.model_dump(), user_id=current_user.id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

# --- PUT / DELETE Endpoints ---
@app.put("/accounts/{item_id}", response_model=schemas.Account)
def update_account(item_id: int, item: schemas.AccountCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Account).filter(models.Account.id == item_id).first()
    for k, v in item.model_dump().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/accounts/{item_id}")
def delete_account(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Account).filter(models.Account.id == item_id).first()
    db.delete(db_item)
    db.commit()
    return {"ok": True}

@app.put("/incomes/{item_id}", response_model=schemas.Income)
def update_income(item_id: int, item: schemas.IncomeCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Income).filter(models.Income.id == item_id).first()
    for k, v in item.model_dump().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/incomes/{item_id}")
def delete_income(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Income).filter(models.Income.id == item_id).first()
    db.delete(db_item)
    db.commit()
    return {"ok": True}

@app.put("/expenses/{item_id}", response_model=schemas.Expense)
def update_expense(item_id: int, item: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Expense).filter(models.Expense.id == item_id).first()
    for k, v in item.model_dump().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/expenses/{item_id}")
def delete_expense(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Expense).filter(models.Expense.id == item_id).first()
    db.delete(db_item)
    db.commit()
    return {"ok": True}

@app.put("/goals/{item_id}", response_model=schemas.Goal)
def update_goal(item_id: int, item: schemas.GoalCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Goal).filter(models.Goal.id == item_id).first()
    for k, v in item.model_dump().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/goals/{item_id}")
def delete_goal(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Goal).filter(models.Goal.id == item_id).first()
    db.delete(db_item)
    db.commit()
    return {"ok": True}


from datetime import datetime

@app.get("/dashboard/summary")
def get_summary(target_currency: str = "AED", db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
    incomes = db.query(models.Income).filter(models.Income.user_id == current_user.id).all()
    expenses = db.query(models.Expense).filter(models.Expense.user_id == current_user.id).all()
    goals = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()

    now = datetime.utcnow()
    current_month_incomes = [i for i in incomes if not i.date or (i.date.month == now.month and i.date.year == now.year)]
    current_month_expenses = [e for e in expenses if not e.date or (e.date.month == now.month and e.date.year == now.year)]

    total_bank = sum([config.convert_currency(a.initial_balance, a.currency, target_currency) for a in accounts])
    total_incomes = sum([config.convert_currency(i.amount, i.currency, target_currency) for i in incomes])
    total_expenses = sum([config.convert_currency(e.amount, e.currency, target_currency) for e in expenses])
    total_savings_start = total_bank + total_incomes - total_expenses

    monthly_income = sum([config.convert_currency(i.amount, i.currency, target_currency) for i in current_month_incomes])
    monthly_expense = sum([config.convert_currency(e.amount, e.currency, target_currency) for e in current_month_expenses])
    net_monthly_savings = monthly_income - monthly_expense

    goals_summary = []
    now = datetime.utcnow()
    
    # Sort goals chronologically by target_date securely checking for None
    sorted_goals = sorted(goals, key=lambda x: getattr(x, 'target_date', None) or datetime.max)
    remaining_pool = total_savings_start
    
    for g in sorted_goals:
        g_amount = config.convert_currency(g.target_amount, g.currency, target_currency)
        months_available = (g.target_date - now).total_seconds() / (30.44 * 24 * 3600) if getattr(g, 'target_date', None) else 0
        
        # Allocate pool sequentially via waterfall
        allocated_to_this_goal = max(min(remaining_pool, g_amount), 0)
        remaining_pool -= allocated_to_this_goal
        remaining_for_goal = max(g_amount - allocated_to_this_goal, 0)

        if net_monthly_savings > 0:
            months_needed = remaining_for_goal / net_monthly_savings if remaining_for_goal > 0 else 0
        else:
            months_needed = -1 # Not achievable
            
        goals_summary.append({
            "id": g.id,
            "name": g.name,
            "target": g_amount,
            "target_date": g.target_date.isoformat() if getattr(g, 'target_date', None) else None,
            "created_at": g.created_at.isoformat() if getattr(g, 'created_at', None) else now.isoformat(),
            "base_accumulated": allocated_to_this_goal,
            "remaining": remaining_for_goal,
            "projected_months_needed": months_needed,
            "on_track": (months_needed >= 0 and months_needed <= months_available) if months_available > 0 else False
        })

    return {
        "currency": target_currency,
        "initial_savings": total_savings_start,
        "income_monthly": monthly_income,
        "expense_monthly": monthly_expense,
        "net_savings_monthly": net_monthly_savings,
        "goals": goals_summary,
        "raw_accounts": [schemas.Account.model_validate(a).model_dump() for a in accounts],
        "raw_incomes": [schemas.Income.model_validate(i).model_dump() for i in incomes],
        "raw_expenses": [schemas.Expense.model_validate(e).model_dump() for e in expenses],
        "raw_goals": [schemas.Goal.model_validate(g).model_dump() for g in goals]
    }
