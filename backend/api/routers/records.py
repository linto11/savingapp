from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...domain import models, schemas
from ...api.dependencies import get_current_user, get_default_account_id
from ...infrastructure.database import get_db
from ...services import dashboard_service, db_sync

router = APIRouter(tags=["records"])


@router.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(username=user.username, password=user.password)
    db.add(db_user)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_user)
    return db_user


@router.get("/accounts", response_model=list[schemas.Account])
def get_accounts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Account).filter(models.Account.user_id == current_user.id).all()


@router.post("/accounts", response_model=schemas.Account)
def create_account(account: schemas.AccountCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_account = models.Account(**account.model_dump(), user_id=current_user.id)
    db.add(db_account)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_account)
    return db_account


@router.get("/incomes", response_model=list[schemas.Income])
def get_incomes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Income).filter(models.Income.user_id == current_user.id).all()


@router.post("/incomes", response_model=schemas.Income)
def create_income(income: schemas.IncomeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    payload = income.model_dump()
    if payload.get("account_id") is None:
        payload["account_id"] = get_default_account_id(db, current_user)
    db_income = models.Income(**payload, user_id=current_user.id)
    db.add(db_income)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_income)
    return db_income


@router.get("/expenses", response_model=list[schemas.Expense])
def get_expenses(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Expense).filter(models.Expense.user_id == current_user.id).all()


@router.post("/expenses", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    payload = expense.model_dump()
    if payload.get("account_id") is None:
        payload["account_id"] = get_default_account_id(db, current_user)
    db_expense = models.Expense(**payload, user_id=current_user.id)
    db.add(db_expense)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_expense)
    return db_expense


@router.get("/transfers", response_model=list[schemas.Transfer])
def get_transfers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Transfer).filter(models.Transfer.user_id == current_user.id).all()


@router.post("/transfers", response_model=schemas.Transfer)
def create_transfer(transfer: schemas.TransferCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if transfer.from_account_id == transfer.to_account_id:
        raise HTTPException(status_code=400, detail="Source and destination account must be different")

    from_acc = db.query(models.Account).filter(models.Account.id == transfer.from_account_id, models.Account.user_id == current_user.id).first()
    to_acc = db.query(models.Account).filter(models.Account.id == transfer.to_account_id, models.Account.user_id == current_user.id).first()
    if not from_acc or not to_acc:
        raise HTTPException(status_code=404, detail="Account not found")

    db_transfer = models.Transfer(**transfer.model_dump(), user_id=current_user.id)
    db.add(db_transfer)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_transfer)
    return db_transfer


@router.get("/goals", response_model=list[schemas.Goal])
def get_goals(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()


@router.post("/goals", response_model=schemas.Goal)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_goal = models.Goal(**goal.model_dump(), user_id=current_user.id)
    db.add(db_goal)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_goal)
    return db_goal


@router.put("/accounts/{item_id}", response_model=schemas.Account)
def update_account(item_id: int, item: schemas.AccountCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Account).filter(models.Account.id == item_id).first()
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_item)
    return db_item


@router.delete("/accounts/{item_id}")
def delete_account(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Account).filter(models.Account.id == item_id).first()
    db.delete(db_item)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    return {"ok": True}


@router.put("/incomes/{item_id}", response_model=schemas.Income)
def update_income(item_id: int, item: schemas.IncomeCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Income).filter(models.Income.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Income not found")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_item)
    return db_item


@router.delete("/incomes/{item_id}")
def delete_income(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Income).filter(models.Income.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Income not found")
    db.delete(db_item)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    return {"ok": True}


@router.put("/expenses/{item_id}", response_model=schemas.Expense)
def update_expense(item_id: int, item: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Expense).filter(models.Expense.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Expense not found")
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_item)
    return db_item


@router.delete("/expenses/{item_id}")
def delete_expense(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Expense).filter(models.Expense.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(db_item)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    return {"ok": True}


@router.put("/transfers/{item_id}", response_model=schemas.Transfer)
def update_transfer(item_id: int, item: schemas.TransferCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_item = db.query(models.Transfer).filter(models.Transfer.id == item_id, models.Transfer.user_id == current_user.id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Transfer not found")

    if item.from_account_id == item.to_account_id:
        raise HTTPException(status_code=400, detail="Source and destination account must be different")

    from_acc = db.query(models.Account).filter(models.Account.id == item.from_account_id, models.Account.user_id == current_user.id).first()
    to_acc = db.query(models.Account).filter(models.Account.id == item.to_account_id, models.Account.user_id == current_user.id).first()
    if not from_acc or not to_acc:
        raise HTTPException(status_code=404, detail="Account not found")

    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_item)
    return db_item


@router.delete("/transfers/{item_id}")
def delete_transfer(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_item = db.query(models.Transfer).filter(models.Transfer.id == item_id, models.Transfer.user_id == current_user.id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Transfer not found")
    db.delete(db_item)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    return {"ok": True}


@router.put("/goals/{item_id}", response_model=schemas.Goal)
def update_goal(item_id: int, item: schemas.GoalCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.Goal).filter(models.Goal.id == item_id).first()
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    db.refresh(db_item)
    return db_item


@router.delete("/goals/{item_id}")
def delete_goal(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.Goal).filter(models.Goal.id == item_id).first()
    db.delete(db_item)
    db.commit()
    db_sync.maybe_sync_sqlite_to_supabase(force_replace=True)
    return {"ok": True}


@router.get("/dashboard/summary")
def get_summary(target_currency: str = "AED", db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return dashboard_service.get_summary_payload(db=db, current_user=current_user, target_currency=target_currency)
