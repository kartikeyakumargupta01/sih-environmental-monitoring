# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# SQLALCHEMY DATABASE MODELS
# ============================================================

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Index,
    Integer,
    String,
)

from database import Base


# ============================================================
# UTC TIME HELPER
# ============================================================
#
# All backend timestamps are stored in UTC.
#
# The frontend can later convert the timestamp to the
# authorized user's local timezone for display.
#
# Example:
#
# Database:
# 2026-09-29T06:58:43+00:00
#
# Frontend in India:
# 29 Sep 2026, 12:28:43 PM IST
#
# ============================================================

def utc_now():
    return datetime.now(timezone.utc)


# ============================================================
# USER TABLE
# ============================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )


# ============================================================
# SENSOR READING TABLE
# ============================================================
#
# IMPORTANT:
#
# Every ESP32 upload creates a NEW row.
#
# We do not overwrite the latest row.
#
# This gives us historical readings required by the graphs.
#
# Units:
#
# water_level   -> cm
# rainfall      -> raw ADC
# temperature   -> °C
# humidity      -> %
# smoke         -> MQ-2 estimated value
# gas           -> MQ-2 estimated value
# pm25          -> null for current prototype
#
# ============================================================

class SensorReading(Base):

    __tablename__ = "sensor_readings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # --------------------------------------------------------
    # NODE
    # --------------------------------------------------------

    node_id = Column(
        String(50),
        index=True,
        nullable=False
    )

    # --------------------------------------------------------
    # HAZARD TYPE
    # --------------------------------------------------------
    #
    # Current ESP32 receiver can continue sending:
    #
    # flood
    #
    # We will still evaluate all available environmental
    # sensors in route.py.
    #
    # --------------------------------------------------------

    hazard_type = Column(
        String(30),
        nullable=False
    )

    # --------------------------------------------------------
    # FLOOD SENSOR
    # --------------------------------------------------------
    #
    # centimetres
    #
    # --------------------------------------------------------

    water_level = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # RAIN SENSOR
    # --------------------------------------------------------
    #
    # Raw ESP32 ADC:
    #
    # 0 - 4095
    #
    # Lower value = wetter sensor.
    #
    # --------------------------------------------------------

    rainfall = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # DHT11 TEMPERATURE
    # --------------------------------------------------------

    temperature = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # DHT11 HUMIDITY
    # --------------------------------------------------------

    humidity = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # MQ-2 SMOKE VALUE
    # --------------------------------------------------------

    smoke = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # MQ-2 GAS VALUE
    # --------------------------------------------------------

    gas = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # PM2.5
    # --------------------------------------------------------
    #
    # Current hardware:
    #
    # pm25 = null
    #
    # --------------------------------------------------------

    pm25 = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # RISK SCORE
    # --------------------------------------------------------

    risk_score = Column(
        Float,
        default=0,
        nullable=False
    )

    # --------------------------------------------------------
    # RISK LEVEL
    # --------------------------------------------------------
    #
    # SAFE
    # MEDIUM
    # CRITICAL
    #
    # --------------------------------------------------------

    risk_level = Column(
        String(20),
        default="SAFE",
        nullable=False
    )

    # --------------------------------------------------------
    # EXACT SENSOR RECORD TIME
    # --------------------------------------------------------
    #
    # This timestamp is generated by FastAPI when the
    # reading is stored.
    #
    # It will be used for:
    #
    # - latest reading
    # - trend graphs
    # - node freshness
    # - offline detection
    #
    # --------------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True
    )


# ============================================================
# SENSOR READING INDEXES
# ============================================================
#
# These improve queries such as:
#
# latest reading for NODE-F01
#
# reading history for NODE-F01
#
# ============================================================

Index(
    "ix_sensor_readings_node_created",
    SensorReading.node_id,
    SensorReading.created_at
)


# ============================================================
# ALERT TABLE
# ============================================================
#
# Alerts are stored separately from sensor readings.
#
# This is important because the Alert Center needs:
#
# - exact historical alerts
# - severity
# - message
# - exact time
#
# ============================================================

class Alert(Base):

    __tablename__ = "alerts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # --------------------------------------------------------
    # NODE
    # --------------------------------------------------------

    node_id = Column(
        String(50),
        nullable=False,
        index=True
    )

    # --------------------------------------------------------
    # HAZARD
    # --------------------------------------------------------
    #
    # Examples:
    #
    # flood
    # fire
    # air
    # environment
    #
    # --------------------------------------------------------

    hazard_type = Column(
        String(30),
        nullable=False,
        index=True
    )

    # --------------------------------------------------------
    # ALERT SEVERITY
    # --------------------------------------------------------
    #
    # MEDIUM
    # CRITICAL
    #
    # SAFE normally does not need an alert record.
    #
    # --------------------------------------------------------

    severity = Column(
        String(20),
        nullable=False,
        index=True
    )

    # --------------------------------------------------------
    # HUMAN-READABLE MESSAGE
    # --------------------------------------------------------

    message = Column(
        String(300),
        nullable=False
    )

    # --------------------------------------------------------
    # EXACT ALERT RECORD TIME
    # --------------------------------------------------------
    #
    # This timestamp becomes the source of truth for
    # the Alert Center.
    #
    # The frontend must display this value instead of
    # generating a fresh browser time.
    #
    # --------------------------------------------------------

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True
    )


# ============================================================
# ALERT INDEXES
# ============================================================

Index(
    "ix_alerts_node_created",
    Alert.node_id,
    Alert.created_at
)

Index(
    "ix_alerts_severity_created",
    Alert.severity,
    Alert.created_at
)