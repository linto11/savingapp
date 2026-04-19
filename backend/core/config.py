import json
import os

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "app_settings.json")

DEFAULT_SETTINGS = {
    "base_currency": "AED",
    "exchange_rates": {"AED": 1.0, "USD": 0.27, "INR": 22.5},
    "emergency_buffer": 50000,
    "database_mode": "sqlite",
    "database_choice_confirmed": False,
    "sync_to_supabase": False,
    "supabase_db_host": "aws-1-ap-northeast-1.pooler.supabase.com",
    "supabase_db_user": "postgres.vtflzxqdvmodpbeonfue",
    "supabase_db_name": "postgres",
    "supabase_db_port": 5432,
}


def _merge_defaults(data=None):
    payload = data or {}
    return {
        **DEFAULT_SETTINGS,
        **payload,
        "exchange_rates": {
            **DEFAULT_SETTINGS["exchange_rates"],
            **(payload.get("exchange_rates") or {}),
        },
    }


def load_settings():
    try:
        with open(SETTINGS_FILE, "r") as f:
            data = json.load(f)
            return _merge_defaults(data)
    except FileNotFoundError:
        return _merge_defaults()


def save_settings(settings):
    payload = _merge_defaults(settings)
    payload.pop("supabase_db_password", None)
    payload.pop("supabase_api_key", None)
    payload.pop("supabase_connection_string", None)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(payload, f, indent=2)

def get_exchange_rate(from_curr: str, to_curr: str) -> float:
    # converts $amount in from_curr to to_curr
    # e.g., AED to INR: 1 AED = 22.5 INR
    # AED is base. 
    # to convert USD to INR:
    # 1 USD -> (1/0.27) AED -> (1/0.27) * 22.5 INR.
    settings = load_settings()
    rates = settings.get("exchange_rates", {})
    rate_from = rates.get(from_curr, 1.0)
    rate_to = rates.get(to_curr, 1.0)
    
    # Actually, if AED is base (1.0), USD is 0.27 (meaning 1 AED = 0.27 USD).
    # Wait, usually 1 USD = 3.67 AED.
    # If settings say "USD": 0.27, that means 1 AED = 0.27 USD.
    # Let's define the config correctly: 
    # value_in_base = amount / rate_from
    # amount_in_to = value_in_base * rate_to
    if from_curr == to_curr:
        return 1.0
    
    value_in_base = 1.0 / rate_from
    result_rate = value_in_base * rate_to
    return result_rate

def convert_currency(amount: float, from_curr: str, to_curr: str) -> float:
    converted = amount * get_exchange_rate(from_curr, to_curr)
    if from_curr != to_curr:
        return round(converted)
    return converted
