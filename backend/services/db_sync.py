from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..core import config
from ..domain import models
from ..infrastructure.database import Base, build_database_url, create_configured_engine

SOURCE_SQLITE_URL = os.getenv("SOURCE_SQLITE_URL", "sqlite:///./savings.db")

IMPORT_ORDER: list[type] = [
    models.Household,
    models.User,
    models.Account,
    models.Income,
    models.Expense,
    models.Transfer,
    models.Goal,
]


def row_to_dict(instance) -> dict:
    return {column.name: getattr(instance, column.name) for column in instance.__table__.columns}


def collect_table_counts(session) -> dict[str, int]:
    return {model.__tablename__: session.query(model).count() for model in IMPORT_ORDER}


def migrate_model(source_session, target_session, model) -> int:
    rows = source_session.query(model).order_by(model.id.asc()).all()
    for row in rows:
        target_session.merge(model(**row_to_dict(row)))
    target_session.commit()
    return len(rows)


def clear_target_data(target_session):
    for model in reversed(IMPORT_ORDER):
        target_session.query(model).delete()
    target_session.commit()


def maybe_sync_sqlite_to_supabase(force_replace: bool = True, raise_errors: bool = False, settings_override: dict | None = None):
    settings_data = settings_override or config.load_settings()
    if (settings_data.get("database_mode") or "sqlite") != "sqlite":
        return None
    if not settings_data.get("sync_to_supabase"):
        return None

    sync_settings = {**settings_data, "database_mode": "supabase"}
    try:
        return migrate_sqlite_to_target(
            settings=sync_settings,
            skip_if_target_has_data=False,
            replace_existing=force_replace,
        )
    except Exception as exc:
        if raise_errors:
            raise
        return {"ok": False, "skipped": True, "reason": str(exc)}


def compare_sqlite_to_target(settings=None):
    settings = settings or config.load_settings()
    sync_settings = {**settings, "database_mode": "supabase"}
    target_database_url, provider = build_database_url(sync_settings)

    source_engine = create_engine(
        SOURCE_SQLITE_URL,
        connect_args={"check_same_thread": False} if SOURCE_SQLITE_URL.startswith("sqlite") else {},
    )
    SourceSession = sessionmaker(autocommit=False, autoflush=False, bind=source_engine)
    source_session = SourceSession()

    try:
        source_counts = collect_table_counts(source_session)
    finally:
        source_session.close()
        source_engine.dispose()

    if provider != "supabase":
        return {
            "ok": False,
            "in_sync": False,
            "provider": "sqlite",
            "source_counts": source_counts,
            "target_counts": {},
            "reason": "Supabase is not configured for comparison yet.",
        }

    target_engine = create_configured_engine(target_database_url)
    TargetSession = sessionmaker(autocommit=False, autoflush=False, bind=target_engine)
    target_session = TargetSession()

    try:
        Base.metadata.create_all(bind=target_engine)
        target_counts = collect_table_counts(target_session)
        differences = {
            table: {"sqlite": source_counts.get(table, 0), "supabase": target_counts.get(table, 0)}
            for table in source_counts
            if source_counts.get(table, 0) != target_counts.get(table, 0)
        }
        return {
            "ok": True,
            "in_sync": len(differences) == 0,
            "provider": provider,
            "source_counts": source_counts,
            "target_counts": target_counts,
            "differences": differences,
        }
    finally:
        target_session.close()
        target_engine.dispose()


def migrate_sqlite_to_target(settings=None, skip_if_target_has_data: bool = True, replace_existing: bool = False):
    settings = settings or config.load_settings()
    target_database_url, provider = build_database_url(settings)

    if provider != "supabase":
        return {"ok": False, "skipped": True, "reason": "Target database is not configured for Supabase."}

    source_engine = create_engine(
        SOURCE_SQLITE_URL,
        connect_args={"check_same_thread": False} if SOURCE_SQLITE_URL.startswith("sqlite") else {},
    )
    target_engine = create_configured_engine(target_database_url)

    SourceSession = sessionmaker(autocommit=False, autoflush=False, bind=source_engine)
    TargetSession = sessionmaker(autocommit=False, autoflush=False, bind=target_engine)

    Base.metadata.create_all(bind=target_engine)

    source_session = SourceSession()
    target_session = TargetSession()

    try:
        existing_rows = sum(target_session.query(model).count() for model in IMPORT_ORDER)
        if replace_existing and existing_rows > 0:
            clear_target_data(target_session)
            existing_rows = 0

        if skip_if_target_has_data and existing_rows > 0:
            return {"ok": True, "skipped": True, "reason": "Target database already contains data.", "existing_rows": existing_rows}

        counts = {}
        for model in IMPORT_ORDER:
            counts[model.__tablename__] = migrate_model(source_session, target_session, model)
        return {"ok": True, "skipped": False, "counts": counts}
    finally:
        source_session.close()
        target_session.close()
        source_engine.dispose()
        target_engine.dispose()


def main() -> None:
    result = migrate_sqlite_to_target()
    if not result.get("ok") and not result.get("skipped"):
        raise SystemExit(result.get("reason", "Migration failed."))

    if result.get("skipped"):
        print(result.get("reason", "Migration skipped."))
    else:
        print("Migration complete.")
        for table, count in result.get("counts", {}).items():
            print(f"Imported {count} rows into {table}")


if __name__ == "__main__":
    main()
