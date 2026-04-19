import os

from fastapi import APIRouter, HTTPException

from ...core import config
from ...domain import models
from ...core.bootstrap import ensure_backward_compatible_schema
from ...infrastructure import database
from ...services import db_sync

router = APIRouter(tags=["settings"])


@router.get("/settings")
def get_settings():
    settings_data = config.load_settings()
    db_status = database.get_database_status()
    return {
        **settings_data,
        "supabase_db_password": "",
        "supabase_api_key": "",
        "supabase_connection_string": "",
        "supabase_password_saved": bool(database.RUNTIME_SUPABASE_PASSWORD),
        "supabase_key_saved": bool(database.RUNTIME_SUPABASE_KEY),
        "supabase_project_url": os.getenv("SUPABASE_URL", ""),
        "database_provider_active": db_status.get("provider", "sqlite"),
        "database_target_label": db_status.get("url", "sqlite:///./savings.db"),
    }


@router.get("/settings/sync-status")
def get_sync_status():
    settings_data = config.load_settings()
    db_status = database.get_database_status()
    status_payload = {
        "active_provider": db_status.get("provider", "sqlite"),
        "active_target": db_status.get("url", "sqlite:///./savings.db"),
        "database_mode": (settings_data.get("database_mode") or "sqlite").lower(),
        "sync_enabled": bool(settings_data.get("sync_to_supabase")),
    }

    if status_payload["database_mode"] == "supabase" or status_payload["sync_enabled"]:
        try:
            status_payload.update(db_sync.compare_sqlite_to_target(settings=settings_data))
        except Exception as exc:
            status_payload.update({"ok": False, "in_sync": False, "reason": str(exc)})
    else:
        status_payload.update({
            "ok": True,
            "in_sync": False,
            "source_counts": {},
            "target_counts": {},
            "reason": "Supabase sync is currently disabled.",
        })

    return status_payload


@router.post("/settings")
def update_settings(settings: dict):
    existing_settings = config.load_settings()
    merged_settings = {**existing_settings, **settings, "database_choice_confirmed": True}

    provided_password = (settings.get("supabase_db_password") or "").strip()
    provided_api_key = (settings.get("supabase_api_key") or "").strip()
    provided_connection_string = (settings.get("supabase_connection_string") or "").strip()
    database.set_runtime_secrets(
        password=provided_password or None,
        api_key=provided_api_key or None,
        connection_string=provided_connection_string or None,
    )

    persisted_settings = {
        key: value for key, value in merged_settings.items()
        if key not in {"supabase_db_password", "supabase_api_key", "supabase_connection_string"}
    }

    try:
        database_mode = (persisted_settings.get("database_mode") or "sqlite").lower()
        sync_to_supabase = bool(persisted_settings.get("sync_to_supabase"))
        verify_database = database_mode == "supabase"

        database.configure_database(persisted_settings, verify=verify_database)
        models.Base.metadata.create_all(bind=database.engine)
        ensure_backward_compatible_schema()
        migration_result = None

        if verify_database:
            migration_result = db_sync.migrate_sqlite_to_target(
                settings=persisted_settings,
                skip_if_target_has_data=False,
                replace_existing=False,
            )
        elif sync_to_supabase:
            migration_result = db_sync.maybe_sync_sqlite_to_supabase(
                force_replace=True,
                raise_errors=True,
                settings_override=persisted_settings,
            )
            if migration_result and not migration_result.get("ok", False):
                raise ValueError(migration_result.get("reason", "Supabase sync failed"))

        config.save_settings(persisted_settings)
        return {
            "ok": True,
            "database_provider": database.get_database_status().get("provider", "sqlite"),
            "migration": migration_result,
        }
    except Exception as exc:
        database.configure_database(existing_settings, verify=False)
        raise HTTPException(status_code=400, detail=f"Failed to activate the selected database: {exc}")
