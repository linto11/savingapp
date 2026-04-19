from fastapi import Depends
from sqlalchemy.orm import Session

from ..domain import models
from ..infrastructure.database import get_db


def get_current_user(db: Session = Depends(get_db)):
    user = db.query(models.User).first()
    if not user:
        user = models.User(username="demo", password="password")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_default_account_id(db: Session, current_user: models.User):
    default_account = db.query(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Account.name == "Linto - ENBD"
    ).first()
    if default_account:
        return default_account.id

    fallback_account = db.query(models.Account).filter(
        models.Account.user_id == current_user.id
    ).order_by(models.Account.id.asc()).first()
    if fallback_account:
        return fallback_account.id

    return None


def infer_account_id_from_text(accounts: list[models.Account], text_value: str | None, fallback_account_id: int | None = None):
    normalized_text = (text_value or "").strip().lower()
    for account in accounts:
        owner_name = account.name.split("-")[0].strip().lower()
        if owner_name and owner_name in normalized_text:
            return account.id
    return fallback_account_id
