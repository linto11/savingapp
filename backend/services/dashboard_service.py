from datetime import datetime

from sqlalchemy.orm import Session

from ..core import config
from ..domain import models, schemas
from ..api.dependencies import get_default_account_id, infer_account_id_from_text


def get_summary_payload(db: Session, current_user: models.User, target_currency: str = "AED"):
    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
    incomes = db.query(models.Income).filter(models.Income.user_id == current_user.id).all()
    expenses = db.query(models.Expense).filter(models.Expense.user_id == current_user.id).all()
    goals = db.query(models.Goal).filter(models.Goal.user_id == current_user.id).all()
    transfers = db.query(models.Transfer).filter(models.Transfer.user_id == current_user.id).all()

    master_incomes = [i for i in incomes if getattr(i, 'date', None) is None]
    master_expenses = [e for e in expenses if getattr(e, 'date', None) is None]
    ledger_incomes = [i for i in incomes if getattr(i, 'date', None) is not None]
    ledger_expenses = [e for e in expenses if getattr(e, 'date', None) is not None]

    now = datetime.utcnow()
    current_month_incomes = [i for i in ledger_incomes if i.date.month == now.month and i.date.year == now.year]
    current_month_expenses = [e for e in ledger_expenses if e.date.month == now.month and e.date.year == now.year]

    settings_data = config.load_settings()
    base_currency = settings_data.get("base_currency", "AED")
    emergency_buffer_base = settings_data.get("emergency_buffer", 50000)
    emergency_buffer = config.convert_currency(emergency_buffer_base, base_currency, target_currency)

    account_lookup = {a.id: a for a in accounts}
    account_balances = {a.id: a.initial_balance for a in accounts}
    default_account_id = get_default_account_id(db, current_user)
    unassigned_balance_target = 0.0

    for income in ledger_incomes:
        target_account_id = getattr(income, 'account_id', None) or infer_account_id_from_text(accounts, getattr(income, 'source', None), default_account_id)
        if target_account_id in account_balances:
            account = account_lookup[target_account_id]
            account_balances[target_account_id] += config.convert_currency(income.amount, income.currency, account.currency)
        else:
            unassigned_balance_target += config.convert_currency(income.amount, income.currency, target_currency)

    for expense in ledger_expenses:
        target_account_id = getattr(expense, 'account_id', None)
        if target_account_id in account_balances:
            account = account_lookup[target_account_id]
            account_balances[target_account_id] -= config.convert_currency(expense.amount, expense.currency, account.currency)
        else:
            unassigned_balance_target -= config.convert_currency(expense.amount, expense.currency, target_currency)

    for transfer in transfers:
        from_account = account_lookup.get(transfer.from_account_id)
        to_account = account_lookup.get(transfer.to_account_id)
        if from_account and to_account:
            out_amount = config.convert_currency(transfer.amount, transfer.currency, from_account.currency)
            in_amount = config.convert_currency(transfer.amount, transfer.currency, to_account.currency)
            account_balances[from_account.id] -= out_amount
            account_balances[to_account.id] += in_amount

    total_bank = sum([config.convert_currency(account_balances[a.id], a.currency, target_currency) for a in accounts])
    total_savings_start = total_bank + unassigned_balance_target

    monthly_income = sum([config.convert_currency(i.amount, i.currency, target_currency) for i in current_month_incomes])
    monthly_expense = sum([config.convert_currency(e.amount, e.currency, target_currency) for e in current_month_expenses])
    net_monthly_savings = monthly_income - monthly_expense

    goals_summary = []
    sorted_goals = sorted(goals, key=lambda x: getattr(x, 'target_date', None) or datetime.max)
    remaining_pool = max(total_savings_start - emergency_buffer, 0)
    available_for_goals = remaining_pool

    for goal in sorted_goals:
        goal_amount = config.convert_currency(goal.target_amount, goal.currency, target_currency)
        months_available = (goal.target_date - now).total_seconds() / (30.44 * 24 * 3600) if getattr(goal, 'target_date', None) else 0

        allocated_to_this_goal = max(min(remaining_pool, goal_amount), 0)
        remaining_pool -= allocated_to_this_goal
        remaining_for_goal = max(goal_amount - allocated_to_this_goal, 0)

        if net_monthly_savings > 0:
            months_needed = remaining_for_goal / net_monthly_savings if remaining_for_goal > 0 else 0
        else:
            months_needed = -1

        goals_summary.append({
            "id": goal.id,
            "name": goal.name,
            "target": goal_amount,
            "target_date": goal.target_date.isoformat() if getattr(goal, 'target_date', None) else None,
            "created_at": goal.created_at.isoformat() if getattr(goal, 'created_at', None) else now.isoformat(),
            "base_accumulated": allocated_to_this_goal,
            "remaining": remaining_for_goal,
            "projected_months_needed": months_needed,
            "on_track": (months_needed >= 0 and months_needed <= months_available) if months_available > 0 else False
        })

    raw_accounts = []
    for account in accounts:
        row = schemas.Account.model_validate(account).model_dump()
        row["current_balance"] = account_balances.get(account.id, account.initial_balance)
        raw_accounts.append(row)

    return {
        "currency": target_currency,
        "initial_savings": total_savings_start,
        "emergency_buffer": emergency_buffer,
        "available_for_goals": available_for_goals,
        "income_monthly": monthly_income,
        "expense_monthly": monthly_expense,
        "net_savings_monthly": net_monthly_savings,
        "goals": goals_summary,
        "master_income_total": sum([config.convert_currency(i.amount, i.currency, target_currency) for i in master_incomes]),
        "master_expense_total": sum([config.convert_currency(e.amount, e.currency, target_currency) for e in master_expenses]),
        "raw_accounts": raw_accounts,
        "raw_incomes": [schemas.Income.model_validate(i).model_dump() for i in master_incomes],
        "raw_expenses": [schemas.Expense.model_validate(e).model_dump() for e in master_expenses],
        "ledger_incomes": [schemas.Income.model_validate(i).model_dump() for i in ledger_incomes],
        "ledger_expenses": [schemas.Expense.model_validate(e).model_dump() for e in ledger_expenses],
        "raw_transfers": [schemas.Transfer.model_validate(t).model_dump() for t in transfers],
        "raw_goals": [schemas.Goal.model_validate(g).model_dump() for g in goals],
    }
