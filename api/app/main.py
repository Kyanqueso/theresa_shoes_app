from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.config.security_headers import SecurityHeadersMiddleware
from app.config.settings import get_settings
from app.router import api_router

settings = get_settings()

app = FastAPI(title="Theresa Shoes API", version="1.0.0")

# Registered first, so CORS ends up outermost and answers preflights itself. Those OPTIONS
# responses therefore skip this middleware — which is fine: a preflight carries no body to
# protect, and the real response that follows is covered.
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


handler = Mangum(app)
