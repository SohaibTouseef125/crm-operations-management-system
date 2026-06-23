import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pathlib import Path
from contextlib import asynccontextmanager
from app.core.config import settings
from app.database.session import engine, AsyncSessionLocal
from app.routers import (
    auth, devices, clients, leads, tasks, billing, inventory,
    users, notifications, activity_logs, dashboard, issues, uploads, reports, components,
    invoices, quotations, farms, farmers, payments, products, services,
    calendar as calendar_router
)
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.logging import AuditMiddleware
from urllib.parse import urlparse, urlunparse



# ── APScheduler for overdue detection ────────────────────────────────────────
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from app.services.overdue_service import run_overdue_job
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(run_overdue_job, "cron", hour=0, minute=5, id="overdue_detector")
    _SCHEDULER_AVAILABLE = True
except ImportError:
    _SCHEDULER_AVAILABLE = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    if _SCHEDULER_AVAILABLE:
        _scheduler.start()
    yield
    if _SCHEDULER_AVAILABLE:
        _scheduler.shutdown(wait=False)


app = FastAPI(
    title="Crop2X Internal CRM & Operations Management System",
    description="Enterprise-grade CRM for hardware and agriculture operations.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── HTTPS redirect middleware ─────────────────────────────────────────────────
# Hugging Face proxy strips https and forwards as http internally.
# When FastAPI does a 307 trailing-slash redirect it uses the internal http scheme.
# This middleware rewrites every redirect response to use https.
from urllib.parse import urlparse, urlunparse
from fastapi import Request

@app.middleware("http")
async def force_correct_scheme_redirects(request: Request, call_next):
    response = await call_next(request)

    if response.status_code in (301, 302, 307, 308):
        location = response.headers.get("location")

        if location:
            parsed = urlparse(location)

            # agar proxy ya backend http bana raha hai
            if parsed.scheme == "http":
                # production detection (proxy headers check)
                forwarded_proto = request.headers.get("x-forwarded-proto")
                host = request.headers.get("host", "")

                # decide correct scheme
                if forwarded_proto:
                    scheme = forwarded_proto
                elif "localhost" in host:
                    scheme = "http"
                else:
                    scheme = "https"

                corrected = parsed._replace(scheme=scheme)
                new_location = urlunparse(corrected)

                response.headers["location"] = new_location

    return response

# Add middleware (order matters - first added is outermost)
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(AuditMiddleware, db_session_maker=AsyncSessionLocal)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (invoices, inventory media)
_uploads_dir = Path("uploads")
_uploads_dir.mkdir(parents=True, exist_ok=True)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(devices.router, prefix="/devices", tags=["Devices"])
app.include_router(clients.router, prefix="/clients", tags=["Clients"])
app.include_router(leads.router, prefix="/leads", tags=["Leads"])
app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
app.include_router(billing.router, prefix="/billing", tags=["Billing"])
app.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
app.include_router(quotations.router, prefix="/quotations", tags=["Quotations"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(components.router, prefix="/components", tags=["Components"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(activity_logs.router, prefix="/activity-logs", tags=["Activity Logs"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(issues.router, prefix="", tags=["Issues"])
app.include_router(reports.router, prefix="/reports", tags=["Field Reports"])
app.include_router(farms.router, prefix="/farms", tags=["Farms"])
app.include_router(farmers.router, prefix="/farmers", tags=["Farmers"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(services.router, prefix="/services", tags=["Services"])
app.include_router(documents_router.router, prefix="/clients/{client_id}/documents", tags=["Documents"])
app.include_router(uploads.router, prefix="/uploads", tags=["File Uploads"])
app.include_router(calendar_router, prefix="/calendar", tags=["Calendar"])

# Mount uploads after routers to avoid route conflicts
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

@app.get("/")
async def root():
    return {"message": "Welcome to Crop2x CRM API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
