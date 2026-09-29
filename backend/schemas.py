# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# PYDANTIC SCHEMAS
# ============================================================

from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator
)


# ============================================================
# AUTH SCHEMAS
# ============================================================

class UserRegister(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=6,
        max_length=128
    )


class UserLogin(BaseModel):

    email: EmailStr

    password: str = Field(
        ...,
        min_length=6,
        max_length=128
    )


class UserResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    name: str

    email: EmailStr


class TokenResponse(BaseModel):

    access_token: str

    token_type: str = "bearer"

    user: UserResponse


# ============================================================
# SENSOR READING CREATE
# ============================================================
#
# This is the JSON sent by the ESP32 receiver to:
#
# POST /api/readings
#
# Expected units:
#
# water_level  -> centimetres
# rainfall     -> raw ADC value
# temperature  -> Celsius
# humidity     -> percentage
# smoke        -> estimated MQ-2 value
# gas          -> estimated MQ-2 value
# pm25         -> null for current prototype
#
# ============================================================

class SensorReadingCreate(BaseModel):

    node_id: str = Field(
        ...,
        min_length=1,
        max_length=50
    )

    hazard_type: str = Field(
        default="flood",
        min_length=1,
        max_length=30
    )

    # --------------------------------------------------------
    # FLOOD / WATER LEVEL
    # --------------------------------------------------------

    water_level: Optional[float] = Field(
        default=None,
        ge=0,
        description="Water level in centimetres"
    )

    # --------------------------------------------------------
    # RAIN SENSOR
    # --------------------------------------------------------
    #
    # ESP32 12-bit ADC:
    #
    # 0 - 4095
    #
    # Lower reading = wetter sensor.
    #
    # --------------------------------------------------------

    rainfall: Optional[float] = Field(
        default=None,
        ge=0,
        le=4095,
        description="Raw rain sensor ADC value"
    )

    # --------------------------------------------------------
    # TEMPERATURE
    # --------------------------------------------------------

    temperature: Optional[float] = Field(
        default=None,
        ge=-50,
        le=100,
        description="Temperature in degrees Celsius"
    )

    # --------------------------------------------------------
    # HUMIDITY
    # --------------------------------------------------------

    humidity: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Relative humidity percentage"
    )

    # --------------------------------------------------------
    # MQ-2 SMOKE
    # --------------------------------------------------------

    smoke: Optional[float] = Field(
        default=None,
        ge=0,
        description="Estimated MQ-2 smoke/gas value"
    )

    # --------------------------------------------------------
    # MQ-2 GAS
    # --------------------------------------------------------

    gas: Optional[float] = Field(
        default=None,
        ge=0,
        description="Estimated MQ-2 gas value"
    )

    # --------------------------------------------------------
    # PM2.5
    # --------------------------------------------------------
    #
    # Current hardware does not provide PM2.5.
    #
    # Receiver currently sends:
    #
    # "pm25": null
    #
    # Keep this field nullable.
    #
    # --------------------------------------------------------

    pm25: Optional[float] = Field(
        default=None,
        ge=0,
        description="PM2.5 concentration when sensor is available"
    )


    # ========================================================
    # CLEAN NODE ID
    # ========================================================

    @field_validator(
        "node_id"
    )
    @classmethod
    def clean_node_id(
        cls,
        value: str
    ) -> str:

        value = value.strip()

        if not value:
            raise ValueError(
                "node_id cannot be empty"
            )

        return value


    # ========================================================
    # NORMALIZE HAZARD TYPE
    # ========================================================

    @field_validator(
        "hazard_type"
    )
    @classmethod
    def normalize_hazard_type(
        cls,
        value: str
    ) -> str:

        value = value.strip().lower()

        allowed = {
            "flood",
            "fire",
            "air",
            "environment"
        }

        if value not in allowed:
            raise ValueError(
                "hazard_type must be "
                "flood, fire, air, or environment"
            )

        return value


# ============================================================
# SENSOR READING RESPONSE
# ============================================================
#
# IMPORTANT:
#
# The frontend needs the complete reading.
#
# This model is used by:
#
# GET /api/readings/latest/{node_id}
#
# GET /api/readings/{node_id}
#
# POST /api/readings
#
# The history endpoint uses these values to build graphs.
#
# ============================================================

class SensorReadingResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    node_id: str

    hazard_type: str

    # --------------------------------------------------------
    # SENSOR VALUES
    # --------------------------------------------------------

    water_level: Optional[float] = None

    rainfall: Optional[float] = None

    temperature: Optional[float] = None

    humidity: Optional[float] = None

    smoke: Optional[float] = None

    gas: Optional[float] = None

    pm25: Optional[float] = None

    # --------------------------------------------------------
    # RISK
    # --------------------------------------------------------

    risk_score: float

    risk_level: str

    # --------------------------------------------------------
    # EXACT DATABASE TIMESTAMP
    # --------------------------------------------------------

    created_at: datetime


# ============================================================
# ALERT RESPONSE
# ============================================================
#
# This will be used by the Alert Center.
#
# created_at is extremely important.
#
# The frontend must display this timestamp instead of
# generating a new Date() for the alert.
#
# ============================================================

class AlertResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    node_id: str

    hazard_type: str

    severity: str

    message: str

    created_at: datetime


# ============================================================
# DASHBOARD SUMMARY RESPONSE
# ============================================================
#
# Used by:
#
# GET /api/dashboard/summary
#
# This structure is designed for the new Overview dashboard.
#
# ============================================================

class DashboardSummaryResponse(BaseModel):

    total_nodes: int = 0

    online_nodes: int = 0

    safe_nodes: int = 0

    medium_nodes: int = 0

    critical_nodes: int = 0

    alerts_today: int = 0

    overall_risk: str = "UNKNOWN"

    latest_reading: Optional[
        SensorReadingResponse
    ] = None


# ============================================================
# HEALTH RESPONSE
# ============================================================

class HealthResponse(BaseModel):

    status: str

    backend: str