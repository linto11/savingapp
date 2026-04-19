from __future__ import annotations

from collections import defaultdict
from datetime import date as date_type, datetime, timedelta
from statistics import pstdev

from ..core import config

MIN_PROPHET_MONTHS = 6
MAX_FORECAST_MONTHS = 1200


def _month_floor(value: datetime) -> datetime:
    return datetime(value.year, value.month, 1)


def _shift_month(value: datetime, offset: int) -> datetime:
    month_index = value.month - 1 + offset
    year = value.year + (month_index // 12)
    month = (month_index % 12) + 1
    return datetime(year, month, 1)


def _month_end(value: datetime) -> datetime:
    return _shift_month(value, 1) - timedelta(days=1)


def _months_until(selected_date: date_type | None, today: date_type) -> int:
    if selected_date is None or selected_date <= today:
        return 1

    months = ((selected_date.year - today.year) * 12) + (selected_date.month - today.month)
    if selected_date.day >= today.day:
        months += 1
    return max(months, 1)


def _aggregate_monthly(items, target_currency: str) -> dict[datetime, float]:
    buckets: dict[datetime, float] = defaultdict(float)
    for item in items:
        item_date = getattr(item, "date", None)
        if item_date is None:
            continue
        buckets[_month_floor(item_date)] += config.convert_currency(item.amount, item.currency, target_currency)
    return dict(sorted(buckets.items(), key=lambda row: row[0]))


def _build_history(income_map: dict[datetime, float], expense_map: dict[datetime, float]) -> list[dict]:
    now = _month_floor(datetime.utcnow())
    all_months = list(income_map.keys()) + list(expense_map.keys())
    if all_months:
        earliest = min(all_months)
        span = ((now.year - earliest.year) * 12) + (now.month - earliest.month) + 1
    else:
        span = 0

    total_months = max(span, MIN_PROPHET_MONTHS)
    start = _shift_month(now, -(total_months - 1))

    history = []
    for idx in range(total_months):
        month = _shift_month(start, idx)
        income = round(float(income_map.get(month, 0.0)), 2)
        expense = round(float(expense_map.get(month, 0.0)), 2)
        history.append({
            "date": month,
            "month": month.strftime("%Y-%m"),
            "income": income,
            "expense": expense,
            "net": round(income - expense, 2),
        })
    return history


def _baseline_forecast(values: list[float], periods: int, floor: float = 0.0) -> tuple[list[float], list[float], list[float]]:
    if not values:
        zeros = [round(floor, 2)] * periods
        return zeros, zeros, zeros

    window = values[-min(len(values), 6):]
    active_window = [value for value in window if abs(value) > 0.01]

    if active_window:
        base = sum(active_window) / len(active_window)
    else:
        base = sum(window) / len(window)

    if len(active_window) >= 3:
        diffs = [active_window[idx] - active_window[idx - 1] for idx in range(1, len(active_window))]
        slope = (sum(diffs) / len(diffs)) if diffs else 0.0
        sparsity_factor = min(len(active_window) / len(window), 1.0)
        slope *= sparsity_factor
    else:
        slope = 0.0

    slope_cap = max(abs(base) * 0.08, 25.0)
    slope = max(min(slope, slope_cap), -slope_cap)

    volatility_source = active_window if len(active_window) > 1 else window
    volatility = pstdev(volatility_source) if len(volatility_source) > 1 else max(abs(base) * 0.05, 10.0)

    predicted = []
    lower = []
    upper = []
    for step in range(1, periods + 1):
        guess = max(base + (slope * step), floor)
        predicted.append(round(guess, 2))
        lower.append(round(max(guess - volatility, floor), 2))
        upper.append(round(guess + volatility, 2))

    return predicted, lower, upper


def _prophet_forecast(history_points: list[dict], periods: int, floor: float = 0.0):
    try:
        import pandas as pd
        from prophet import Prophet
    except Exception:
        return None

    try:
        df = pd.DataFrame(history_points)
        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=False,
            yearly_seasonality=len(history_points) >= 12,
            interval_width=0.8,
            changepoint_prior_scale=0.15,
        )
        model.fit(df)
        future = model.make_future_dataframe(periods=periods, freq="MS")
        forecast = model.predict(future).tail(periods)

        predicted = [round(max(float(value), floor), 2) for value in forecast["yhat"]]
        lower = [round(max(float(value), floor), 2) for value in forecast["yhat_lower"]]
        upper = [round(max(float(value), floor), 2) for value in forecast["yhat_upper"]]
        return predicted, lower, upper
    except Exception:
        return None


def _predict_series(history: list[dict], periods: int, allow_prophet: bool, floor: float = 0.0):
    prophet_points = [{"ds": point["date"], "y": point["value"]} for point in history]
    baseline_predicted, baseline_lower, baseline_upper = _baseline_forecast(
        [point["value"] for point in history],
        periods,
        floor=floor,
    )

    if allow_prophet:
        prophet_result = _prophet_forecast(prophet_points, periods, floor=floor)
        if prophet_result is not None:
            predicted, lower, upper = prophet_result
            return predicted, lower, upper, "prophet"

    return baseline_predicted, baseline_lower, baseline_upper, "baseline"


def _blend_with_recurring(predicted: list[float], recurring_value: float, history_months: int) -> list[float]:
    recurring_value = round(float(recurring_value), 2)
    if recurring_value <= 0:
        return [round(value, 2) for value in predicted]

    if history_months <= 1:
        return [recurring_value for _ in predicted]

    if history_months < 3:
        recurring_weight = 0.9
    elif history_months < 12:
        recurring_weight = 0.75
    else:
        recurring_weight = 0.5

    return [
        round((recurring_weight * recurring_value) + ((1 - recurring_weight) * value), 2)
        for value in predicted
    ]


def _estimate_selected_prediction(
    months: list[dict],
    current_balance: float,
    emergency_buffer: float,
    projected_net_average: float,
    selected_date: date_type | None,
):
    today = datetime.utcnow().date()
    max_date = today

    if months:
        last_month_start = datetime.strptime(months[-1]["month"] + "-01", "%Y-%m-%d")
        max_date = _month_end(last_month_start).date()

    if selected_date is None:
        selected_date = max_date

    if selected_date < today:
        selected_date = today
    if selected_date > max_date:
        selected_date = max_date

    balance = float(current_balance)
    avg_daily_net = float(projected_net_average) / 30.44 if projected_net_average else 0.0

    if selected_date > today:
        if months:
            first_month_start = datetime.strptime(months[0]["month"] + "-01", "%Y-%m-%d").date()
            if today < first_month_start:
                gap_end = min(selected_date, first_month_start - timedelta(days=1))
                gap_days = (gap_end - today).days
                if gap_days > 0:
                    balance += avg_daily_net * gap_days

        for idx, month_state in enumerate(months):
            month_start = datetime.strptime(month_state["month"] + "-01", "%Y-%m-%d")
            month_end = _month_end(month_start)

            if selected_date < month_start.date():
                break

            if selected_date >= month_end.date():
                balance = float(month_state["projected_balance"])
                continue

            previous_balance = current_balance if idx == 0 else float(months[idx - 1]["projected_balance"])
            total_days = max((month_end.date() - month_start.date()).days + 1, 1)
            used_days = max((selected_date - month_start.date()).days + 1, 0)
            balance = previous_balance + (float(month_state["net"]) * (used_days / total_days))
            break

    balance = round(balance, 2)
    return {
        "date": selected_date.isoformat(),
        "projected_balance": balance,
        "available_for_goals": round(max(balance - emergency_buffer, 0), 2),
        "projected_change": round(balance - current_balance, 2),
        "days_ahead": max((selected_date - today).days, 0),
        "min_date": today.isoformat(),
        "max_date": max_date.isoformat(),
    }


def generate_forecast(accounts, incomes, expenses, goals, target_currency: str = "AED", months_ahead: int = 12, selected_date: date_type | None = None):
    now = _month_floor(datetime.utcnow())
    required_months = _months_until(selected_date, now.date()) if selected_date else 0
    months_ahead = max(months_ahead, required_months, 12)
    months_ahead = min(months_ahead, MAX_FORECAST_MONTHS)
    settings_data = config.load_settings()
    base_currency = settings_data.get("base_currency", "AED")
    emergency_buffer_base = settings_data.get("emergency_buffer", 50000)
    emergency_buffer = config.convert_currency(emergency_buffer_base, base_currency, target_currency)

    master_incomes = [item for item in incomes if getattr(item, "date", None) is None]
    master_expenses = [item for item in expenses if getattr(item, "date", None) is None]
    ledger_incomes = [item for item in incomes if getattr(item, "date", None) is not None]
    ledger_expenses = [item for item in expenses if getattr(item, "date", None) is not None]

    current_balance = sum(
        config.convert_currency(account.initial_balance, account.currency, target_currency)
        for account in accounts
    )
    current_balance += sum(config.convert_currency(item.amount, item.currency, target_currency) for item in ledger_incomes)
    current_balance -= sum(config.convert_currency(item.amount, item.currency, target_currency) for item in ledger_expenses)
    current_balance = round(current_balance, 2)

    master_income_total = round(sum(config.convert_currency(item.amount, item.currency, target_currency) for item in master_incomes), 2)
    master_expense_total = round(sum(config.convert_currency(item.amount, item.currency, target_currency) for item in master_expenses), 2)

    income_map = _aggregate_monthly(ledger_incomes, target_currency)
    expense_map = _aggregate_monthly(ledger_expenses, target_currency)
    history = _build_history(income_map, expense_map)
    active_history_months = sum(1 for point in history if point["income"] > 0 or point["expense"] > 0)
    allow_prophet = active_history_months >= MIN_PROPHET_MONTHS

    income_history = [{"date": point["date"], "value": point["income"]} for point in history]
    expense_history = [{"date": point["date"], "value": point["expense"]} for point in history]

    income_forecast, income_lower, income_upper, income_model = _predict_series(
        income_history,
        months_ahead,
        allow_prophet=allow_prophet,
        floor=0.0,
    )
    expense_forecast, expense_lower, expense_upper, expense_model = _predict_series(
        expense_history,
        months_ahead,
        allow_prophet=allow_prophet,
        floor=0.0,
    )

    income_forecast = _blend_with_recurring(income_forecast, master_income_total, active_history_months)
    expense_forecast = _blend_with_recurring(expense_forecast, master_expense_total, active_history_months)

    projected_balance = current_balance
    projected_lower_balance = current_balance
    projected_upper_balance = current_balance
    months = []

    for idx in range(months_ahead):
        month_date = _shift_month(now, idx + 1)
        forecast_income = round(income_forecast[idx], 2)
        forecast_expense = round(expense_forecast[idx], 2)
        forecast_net = round(forecast_income - forecast_expense, 2)

        projected_balance = round(projected_balance + forecast_net, 2)
        projected_lower_balance = round(projected_lower_balance + income_lower[idx] - expense_upper[idx], 2)
        projected_upper_balance = round(projected_upper_balance + income_upper[idx] - expense_lower[idx], 2)

        months.append({
            "month": month_date.strftime("%Y-%m"),
            "income": forecast_income,
            "expense": forecast_expense,
            "net": forecast_net,
            "projected_balance": projected_balance,
            "lower_balance": round(projected_lower_balance, 2),
            "upper_balance": round(projected_upper_balance, 2),
            "available_for_goals": round(max(projected_balance - emergency_buffer, 0), 2),
        })

    goal_forecast = []
    reserved_before = 0.0
    current_available_now = round(max(current_balance - emergency_buffer, 0), 2)

    sorted_goals = sorted(goals, key=lambda goal: getattr(goal, "target_date", None) or datetime.max)
    for goal in sorted_goals:
        goal_target = round(config.convert_currency(goal.target_amount, goal.currency, target_currency), 2)
        deadline_month = _month_floor(goal.target_date) if getattr(goal, "target_date", None) else None

        deadline_state = months[-1] if months else None
        if deadline_month is not None:
            for month_state in months:
                state_month = datetime.strptime(month_state["month"] + "-01", "%Y-%m-%d")
                if state_month >= deadline_month:
                    deadline_state = month_state
                    break

        available_by_deadline = current_available_now if deadline_state is None else deadline_state["available_for_goals"]
        available_after_prior_goals = round(max(available_by_deadline - reserved_before, 0), 2)

        estimated_completion_month = None
        if current_available_now >= reserved_before + goal_target:
            estimated_completion_month = now.strftime("%Y-%m")
        else:
            for month_state in months:
                if month_state["available_for_goals"] >= reserved_before + goal_target:
                    estimated_completion_month = month_state["month"]
                    break

        goal_forecast.append({
            "id": goal.id,
            "name": goal.name,
            "target": goal_target,
            "target_date": goal.target_date.isoformat() if getattr(goal, "target_date", None) else None,
            "available_by_deadline": available_after_prior_goals,
            "estimated_completion_month": estimated_completion_month,
            "on_track": available_after_prior_goals >= goal_target,
        })
        reserved_before += goal_target

    using_prophet = income_model == "prophet" or expense_model == "prophet"
    model_used = "prophet-hybrid" if using_prophet else "baseline-hybrid"

    notes = []
    if using_prophet:
        notes.append("Prophet is active and learning from your dated monthly history.")
    else:
        notes.append("A rolling trend fallback is active until there is enough history or Prophet is available.")
    if active_history_months < MIN_PROPHET_MONTHS:
        notes.append("Forecast confidence is lower because there are fewer than six months of dated transactions.")
    if master_income_total > 0 or master_expense_total > 0:
        notes.append("Recurring master entries are blended in so new expenses update the forecast dynamically.")
    if months_ahead > 12:
        notes.append("The forecast window automatically extended beyond one year based on your selected calendar date.")

    if using_prophet:
        confidence = min(0.94, round(0.58 + (active_history_months * 0.03), 2))
    else:
        confidence = min(0.8, round(0.38 + (active_history_months * 0.04), 2))

    if months_ahead > 12:
        confidence = max(0.2, round(confidence - min((months_ahead - 12) * 0.005, 0.25), 2))

    projected_net_average = round(sum(item["net"] for item in months) / len(months), 2) if months else 0.0
    selected_prediction = _estimate_selected_prediction(
        months=months,
        current_balance=current_balance,
        emergency_buffer=emergency_buffer,
        projected_net_average=projected_net_average,
        selected_date=selected_date,
    )

    return {
        "currency": target_currency,
        "model_used": model_used,
        "confidence": confidence,
        "history_months": active_history_months,
        "current_balance": current_balance,
        "forecast_balance_1y": months[-1]["projected_balance"] if months else current_balance,
        "emergency_buffer": emergency_buffer,
        "projected_income_average": round(sum(item["income"] for item in months) / len(months), 2) if months else 0.0,
        "projected_expense_average": round(sum(item["expense"] for item in months) / len(months), 2) if months else 0.0,
        "projected_net_average": projected_net_average,
        "selected_prediction": selected_prediction,
        "selected_date_min": selected_prediction["min_date"],
        "selected_date_max": selected_prediction["max_date"],
        "historical_months": history,
        "months": months,
        "goal_forecast": goal_forecast,
        "notes": notes,
    }
