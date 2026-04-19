from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routers import forecast, records, settings
from .core.bootstrap import bootstrap_application


def create_app() -> FastAPI:
    bootstrap_application()

    application = FastAPI(title="Savings App API")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(records.router)
    application.include_router(settings.router)
    application.include_router(forecast.router)
    return application


app = create_app()

