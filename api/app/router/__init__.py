from fastapi import APIRouter

from app.router import analytics, attributes, auth, companies, orders, payments, shoes

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(companies.router)
api_router.include_router(shoes.router)
api_router.include_router(attributes.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(analytics.router)
