from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...domain import models
from ...api.dependencies import get_current_user
from ...infrastructure.database import get_db
from ...services import forecasting_service

router = APIRouter(tags=["forecast"])


@router.get("/forecast/projection")
def get_forecast_projection(
    months_ahead: int = 12,
    target_currency: str = "AED",
    selected_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if months_ahead < 1 or months_ahead > 1200:
        raise HTTPException(status_code=400, detail="months_ahead must be between 1 and 1200")

    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
    incomes = db.query(models.Income).filter(models.Income.user_id == current_user.id).all()
    expenses = db.query(models.Expense).filter(models.Expense.user_id == current_user.id).all()
    goals = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()

    return forecasting_service.generate_forecast(
        accounts=accounts,
        incomes=incomes,
        expenses=expenses,
        goals=goals,
        target_currency=target_currency,
        months_ahead=months_ahead,
        selected_date=selected_date,
    )
