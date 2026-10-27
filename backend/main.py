"""AgriPilot AI - FastAPI application entrypoint.

Provides the core application instance, CORS configuration, API health check
endpoints, and centralized global exception handling.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

# Ensure backend directory is in sys.path so sibling imports resolve
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from database import engine
except ImportError:  # pragma: no cover
    engine = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agripilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown routines."""
    logger.info("Starting AgriPilot AI Backend API...")
    yield
    logger.info("Shutting down AgriPilot AI Backend API...")


app = FastAPI(
    title="AgriPilot AI API",
    description="Backend API for AgriPilot AI - autonomous farming and resource orchestration.",
    version="0.1.0",
    lifespan=lifespan,
)

# --------------------------------------------------------------------------- #
# CORS Middleware
# --------------------------------------------------------------------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Global Exception Handlers
# --------------------------------------------------------------------------- #
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle standard HTTP exceptions with structured JSON response."""
    logger.warning("HTTP %d error on %s: %s", exc.status_code, request.url.path, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status_code": exc.status_code,
            "message": exc.detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle request validation errors with field-level details."""
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "message": "Request validation failed.",
            "errors": exc.errors(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all exception handler to ensure consistent error structure for 500s."""
    logger.exception("Unhandled server error on %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "message": "An internal server error occurred.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# --------------------------------------------------------------------------- #
# Core Endpoints
# --------------------------------------------------------------------------- #
@app.get("/", tags=["General"])
async def root():
    """Welcome endpoint with API metadata and documentation links."""
    return {
        "app": "AgriPilot AI API",
        "version": "0.1.0",
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/health",
    }


@app.get("/health", tags=["General"])
async def health_check():
    """Service health check verifying API operational status and database connectivity."""
    db_status = "unknown"
    db_error = None

    if engine is not None:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            db_status = "connected"
        except Exception as exc:
            db_status = "disconnected"
            db_error = str(exc)
            logger.warning("Database connectivity check failed: %s", exc)
    else:
        db_status = "not_configured"

    is_healthy = db_status in ("connected", "not_configured")

    return {
        "status": "healthy" if is_healthy else "degraded",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "api": "healthy",
            "database": {
                "status": db_status,
                "error": db_error,
            },
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
