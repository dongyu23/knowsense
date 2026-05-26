import logging

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth.models import User  # noqa: F401
from app.auth.router import router as auth_router
from app.chat.models import Conversation, Message  # noqa: F401
from app.chat.router import router as chat_router
from app.common.database import engine
from app.common.exception_handlers import (
    general_exception_handler,
    knowsense_exception_handler,
    validation_exception_handler,
)
from app.common.exceptions import KnowSenseException
from app.common.middleware import RequestLoggingMiddleware
from app.common.models import Base
from app.common.schemas import ApiResponse
from app.knowledge.models import Chunk  # noqa: F401
from app.manual.models import ImagePage, Manual  # noqa: F401
from app.manual.router import router as manual_router
from app.storage.models import FileRecord  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("knowsense")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database ready — extensions enabled, tables created")
    yield


app = FastAPI(
    title="瞬知·KnowSense",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware
app.add_middleware(RequestLoggingMiddleware)

# Exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(KnowSenseException, knowsense_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Routers
app.include_router(auth_router)
app.include_router(manual_router)
app.include_router(chat_router)


@app.get("/api/v1/health")
async def health():
    return ApiResponse.ok(data="KnowSense is running")
