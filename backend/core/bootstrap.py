from sqlalchemy import text

from ..core import config
from ..domain import models
from ..api.dependencies import get_default_account_id, infer_account_id_from_text
from ..infrastructure import database
from ..infrastructure.database import SessionLocal


def ensure_backward_compatible_schema():
    if database.engine is None or database.engine.dialect.name != "sqlite":
        return

    with database.engine.begin() as conn:
        income_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(incomes)"))]
        if "account_id" not in income_cols:
            conn.execute(text("ALTER TABLE incomes ADD COLUMN account_id INTEGER"))

        expense_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(expenses)"))]
        if "account_id" not in expense_cols:
            conn.execute(text("ALTER TABLE expenses ADD COLUMN account_id INTEGER"))


def reconcile_legacy_account_links():
    settings_data = config.load_settings()
    if settings_data.get("account_link_migration_version", 0) >= 2:
        return

    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        for user in users:
            accounts = db.query(models.Account).filter(models.Account.user_id == user.id).all()
            if not accounts:
                continue

            default_account_id = get_default_account_id(db, user)

            incomes = db.query(models.Income).filter(models.Income.user_id == user.id).all()
            for income in incomes:
                income.account_id = infer_account_id_from_text(accounts, income.source, default_account_id)

            expenses = db.query(models.Expense).filter(models.Expense.user_id == user.id).all()
            for expense in expenses:
                category_text = (expense.category or "").strip().lower()
                if "transfer" in category_text and default_account_id is not None:
                    expense.account_id = default_account_id
                elif expense.account_id == default_account_id:
                    expense.account_id = None

        db.commit()
        settings_data["account_link_migration_version"] = 2
        config.save_settings(settings_data)
    finally:
        db.close()


def bootstrap_application():
    models.Base.metadata.create_all(bind=database.engine)
    ensure_backward_compatible_schema()
    reconcile_legacy_account_links()
