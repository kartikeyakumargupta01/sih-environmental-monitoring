# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# FASTAPI APPLICATION
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text

from database import (
    Base,
    engine,
)

from route import router as sensor_router
from auth_routes import router as auth_router


# ============================================================
# CREATE DATABASE TABLES
# ============================================================

Base.metadata.create_all(
    bind=engine
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(

    title=(
        "Environmental Prediction System API"
    ),

    description=(
        "Real-time environmental monitoring "
        "and early-warning backend for flood, "
        "forest fire and air-quality monitoring."
    ),

    version="2.0.0",

    docs_url="/docs",

    redoc_url="/redoc",
)


# ============================================================
# CORS
# ============================================================
#
# Development configuration.
#
# This allows the frontend to work whether it is opened from:
#
# http://127.0.0.1:5500
# http://localhost:5500
# Live Server on another local port
# another local development address
#
# We are NOT using cookies for authentication.
# JWT is sent through the Authorization header.
#
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "*"
    ],

    allow_credentials=False,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],

)


# ============================================================
# SENSOR / DASHBOARD ROUTES
# ============================================================

app.include_router(
    sensor_router
)


# ============================================================
# AUTHENTICATION ROUTES
# ============================================================

app.include_router(
    auth_router
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {

        "message":
            "Environmental Prediction System API",

        "status":
            "running",

        "version":
            "2.0.0",

        "documentation":
            "/docs",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/api/health"
)
def health_check():

    database_status = (
        "connected"
    )


    try:

        with engine.connect() as connection:

            connection.execute(
                text(
                    "SELECT 1"
                )
            )


    except Exception as error:

        database_status = (
            "disconnected"
        )

        print(
            "[HEALTH] Database "
            "connection failed:",
            error
        )


    overall_status = (

        "ok"

        if database_status
        == "connected"

        else "degraded"
    )


    return {

        "status":
            overall_status,

        "backend":
            "connected",

        "database":
            database_status,
    }