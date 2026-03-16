from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.api.v1.registry import registry
from app.core.finance_logic import AccretionDilutionModel
from app.core.lbo_logic import LBOModel
from app.schemas.deal import DealInput
from app.schemas.lbo import LBOInput
from app.api.v1.endpoints import deals, dcf, email, ai_chat, market_data, lbo, enterprise, news
import logging
import os

try:
    from app.api.v1.endpoints import stripe
except ModuleNotFoundError:
    stripe = None


logger = logging.getLogger(__name__)


# ---------------- DATABASE INIT ----------------
db_ready = True
try:
    Base.metadata.create_all(bind=engine)
except Exception as exc:
    db_ready = False
    logger.exception("Database initialization failed during startup: %s", exc)


# ---------------- MODULE REGISTRY ----------------
registry.register("accretion_dilution", AccretionDilutionModel)
registry.register("lbo", LBOModel)


# ---------------- APP ----------------
app = FastAPI(title="Modular Financial Platform - Suite Edition")


# ---------------- CORS FIX ----------------
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

for env_key in ("APP_URL", "FRONTEND_URL"):
    frontend_url = os.getenv(env_key)
    if frontend_url:
        origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- ROUTERS ----------------
app.include_router(deals.router, prefix="/api/v1")
app.include_router(dcf.router, prefix="/api/v1/modules/dcf", tags=["dcf"])
app.include_router(lbo.router, prefix="/api/v1/modules/lbo", tags=["lbo"])
app.include_router(email.router, prefix="/api/v1")
app.include_router(ai_chat.router, prefix="/api/v1", tags=["ai"])
app.include_router(market_data.router, prefix="/api/v1", tags=["market"])
app.include_router(news.router, prefix="/api/v1")
app.include_router(enterprise.router, prefix="/api/v1")

if stripe is not None:
    app.include_router(stripe.router, prefix="/api/v1")


# ---------------- ROOT ----------------
@app.get("/")
def read_root():
    return {
        "status": "ok",
        "modules": registry.list_modules(),
        "db_ready": db_ready,
    }


# ---------------- MODULE DISPATCH ----------------
@app.post("/api/v1/modules/{module_name}")
def calculate_module(module_name: str, payload: dict):

    module_cls = registry.get_module(module_name)

    if module_name == "accretion_dilution":
        deal_input = DealInput(**payload)
        model = module_cls(deal_data=deal_input)
        return model.calculate()

    if module_name == "lbo":
        lbo_input = LBOInput(**payload)
        model = module_cls(lbo_data=lbo_input)
        return model.calculate()

    return {"error": "Unsupported configuration"}
