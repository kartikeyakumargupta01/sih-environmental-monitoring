# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# RISK ENGINE
# ============================================================

from typing import Optional, Dict, Any


# ============================================================
# RISK LEVEL CONSTANTS
# ============================================================

SAFE = "SAFE"
MEDIUM = "MEDIUM"
CRITICAL = "CRITICAL"
UNKNOWN = "UNKNOWN"


# ============================================================
# RISK PRIORITY
# ============================================================
#
# Higher number = higher severity.
#
# This lets us combine several sensor conditions and select
# the most serious condition.
#
# ============================================================

RISK_PRIORITY = {
    UNKNOWN: -1,
    SAFE: 0,
    MEDIUM: 1,
    CRITICAL: 2,
}


# ============================================================
# RISK SCORE
# ============================================================
#
# Used for database/dashboard numeric representation.
#
# SAFE     -> 0
# MEDIUM   -> 50
# CRITICAL -> 100
#
# ============================================================

RISK_SCORE = {
    SAFE: 0,
    MEDIUM: 50,
    CRITICAL: 100,
    UNKNOWN: 0,
}


# ============================================================
# HELPER
# ============================================================

def highest_risk(*levels: str) -> str:
    """
    Return the highest risk level from all supplied levels.
    """

    valid_levels = [
        level
        for level in levels
        if level in RISK_PRIORITY
    ]

    if not valid_levels:
        return UNKNOWN

    return max(
        valid_levels,
        key=lambda level: RISK_PRIORITY[level]
    )


# ============================================================
# WATER LEVEL
# HC-SR04
# UNIT: CENTIMETRES
# ============================================================
#
# SAFE:
#     water <= 90 cm
#
# MEDIUM:
#     water > 90 cm and <= 110 cm
#
# CRITICAL:
#     water > 110 cm
#
# ============================================================

def classify_water_level(
    water_level: Optional[float]
) -> str:

    if water_level is None:
        return UNKNOWN

    if water_level <= 90:
        return SAFE

    if water_level <= 110:
        return MEDIUM

    return CRITICAL


# ============================================================
# RAIN SENSOR
# UNIT: RAW ESP32 ADC
# ============================================================
#
# IMPORTANT:
#
# Lower ADC = wetter sensor.
#
# Arduino detailed ranges:
#
# > 3000
#     NO RAIN
#
# 2001 - 3000
#     LOW RAIN
#
# 1001 - 2000
#     MEDIUM RAIN
#
# <= 1000
#     HIGH RAIN
#
#
# Website/backend three-level mapping:
#
# SAFE:
#     ADC > 2000
#
# MEDIUM:
#     ADC 1001 - 2000
#
# CRITICAL:
#     ADC <= 1000
#
# ============================================================

def classify_rain(
    rain_adc: Optional[float]
) -> str:

    if rain_adc is None:
        return UNKNOWN

    if rain_adc > 2000:
        return SAFE

    if rain_adc > 1000:
        return MEDIUM

    return CRITICAL


# ============================================================
# DETAILED RAIN CONDITION
# ============================================================

def get_rain_condition(
    rain_adc: Optional[float]
) -> str:

    if rain_adc is None:
        return "UNKNOWN"

    if rain_adc > 3000:
        return "NO_RAIN"

    if rain_adc > 2000:
        return "LOW_RAIN"

    if rain_adc > 1000:
        return "MEDIUM_RAIN"

    return "HIGH_RAIN"


# ============================================================
# TEMPERATURE
# DHT11
# UNIT: CELSIUS
# ============================================================
#
# SAFE:
#     temperature < 25 C
#
# MEDIUM:
#     25 C to 30 C
#
# CRITICAL:
#     temperature > 30 C
#
# ============================================================

def classify_temperature(
    temperature: Optional[float]
) -> str:

    if temperature is None:
        return UNKNOWN

    if temperature < 25:
        return SAFE

    if temperature <= 30:
        return MEDIUM

    return CRITICAL


# ============================================================
# MQ-2 GAS / SMOKE
# UNIT: ESTIMATED PPM
# ============================================================
#
# SAFE:
#     < 700 ppm
#
# MEDIUM:
#     700 - 1200 ppm
#
# CRITICAL:
#     > 1200 ppm
#
#
# NOTE:
#
# This value is an estimated MQ-2 indication.
# It should not be treated as laboratory-grade gas
# concentration.
#
# ============================================================

def classify_gas(
    gas: Optional[float]
) -> str:

    if gas is None:
        return UNKNOWN

    if gas < 700:
        return SAFE

    if gas <= 1200:
        return MEDIUM

    return CRITICAL


# ============================================================
# SMOKE
# ============================================================
#
# Currently the receiver sends the same MQ-2 estimated value
# for both "smoke" and "gas".
#
# Therefore we currently use the same thresholds.
#
# ============================================================

def classify_smoke(
    smoke: Optional[float]
) -> str:

    return classify_gas(smoke)


# ============================================================
# HUMIDITY
# ============================================================
#
# Humidity is currently displayed and stored only.
#
# No SAFE / MEDIUM / CRITICAL humidity threshold is defined
# for this prototype.
#
# ============================================================

def classify_humidity(
    humidity: Optional[float]
) -> str:

    if humidity is None:
        return UNKNOWN

    return SAFE


# ============================================================
# PM2.5
# ============================================================
#
# IMPORTANT:
#
# Current hardware does not provide a PM2.5 reading.
#
# Receiver sends:
#
#     "pm25": null
#
# Therefore PM2.5 must NOT affect risk calculation.
#
# ============================================================

def classify_pm25(
    pm25: Optional[float]
) -> str:

    if pm25 is None:
        return UNKNOWN

    # No PM2.5 risk thresholds configured yet.
    return UNKNOWN


# ============================================================
# FLOOD RISK
# ============================================================
#
# Flood risk currently uses:
#
# 1. Water level
# 2. Rain sensor
#
# The higher risk becomes the flood risk.
#
# ============================================================

def calculate_flood_risk(
    water_level: Optional[float],
    rainfall: Optional[float]
) -> Dict[str, Any]:

    water_risk = classify_water_level(
        water_level
    )

    rain_risk = classify_rain(
        rainfall
    )

    flood_risk = highest_risk(
        water_risk,
        rain_risk
    )

    return {
        "risk_level": flood_risk,
        "risk_score": RISK_SCORE[flood_risk],
        "water_level_status": water_risk,
        "rain_status": rain_risk,
        "rain_condition": get_rain_condition(
            rainfall
        ),
    }


# ============================================================
# FOREST FIRE RISK
# ============================================================
#
# Current fire indicators:
#
# 1. Temperature
# 2. MQ-2 gas/smoke
#
# Humidity is recorded but does not currently have a
# project-defined risk threshold.
#
# ============================================================

def calculate_fire_risk(
    temperature: Optional[float],
    gas: Optional[float],
    smoke: Optional[float] = None,
    humidity: Optional[float] = None
) -> Dict[str, Any]:

    temperature_risk = classify_temperature(
        temperature
    )

    gas_risk = classify_gas(
        gas
    )

    smoke_risk = classify_smoke(
        smoke
    )

    fire_risk = highest_risk(
        temperature_risk,
        gas_risk,
        smoke_risk
    )

    return {
        "risk_level": fire_risk,
        "risk_score": RISK_SCORE[fire_risk],
        "temperature_status": temperature_risk,
        "gas_status": gas_risk,
        "smoke_status": smoke_risk,
        "humidity_status": classify_humidity(
            humidity
        ),
    }


# ============================================================
# AIR QUALITY RISK
# ============================================================
#
# Current real available sensor:
#
#     MQ-2 gas/smoke
#
# PM2.5 remains null and does not influence risk.
#
# ============================================================

def calculate_air_risk(
    gas: Optional[float],
    pm25: Optional[float] = None
) -> Dict[str, Any]:

    gas_risk = classify_gas(
        gas
    )

    pm25_risk = classify_pm25(
        pm25
    )

    # PM2.5 is currently UNKNOWN and intentionally excluded.
    air_risk = gas_risk

    return {
        "risk_level": air_risk,
        "risk_score": RISK_SCORE[air_risk],
        "gas_status": gas_risk,
        "pm25_status": pm25_risk,
    }


# ============================================================
# COMPLETE ENVIRONMENTAL RISK EVALUATION
# ============================================================
#
# This evaluates every available sensor reading.
#
# It produces:
#
# - flood risk
# - fire risk
# - air-quality risk
# - overall system risk
#
# ============================================================

def evaluate_environmental_risk(
    water_level: Optional[float] = None,
    rainfall: Optional[float] = None,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    smoke: Optional[float] = None,
    gas: Optional[float] = None,
    pm25: Optional[float] = None,
) -> Dict[str, Any]:

    flood = calculate_flood_risk(
        water_level=water_level,
        rainfall=rainfall
    )

    fire = calculate_fire_risk(
        temperature=temperature,
        gas=gas,
        smoke=smoke,
        humidity=humidity
    )

    air = calculate_air_risk(
        gas=gas,
        pm25=pm25
    )

    overall_risk = highest_risk(
        flood["risk_level"],
        fire["risk_level"],
        air["risk_level"]
    )

    return {

        # --------------------------------------------------------
        # FINAL SYSTEM RISK
        # --------------------------------------------------------

        "risk_level":
            overall_risk,

        "risk_score":
            RISK_SCORE[overall_risk],


        # --------------------------------------------------------
        # HAZARD RISKS
        # --------------------------------------------------------

        "flood_risk":
            flood["risk_level"],

        "fire_risk":
            fire["risk_level"],

        "air_risk":
            air["risk_level"],


        # --------------------------------------------------------
        # WATER
        # --------------------------------------------------------

        "water_level_status":
            flood["water_level_status"],


        # --------------------------------------------------------
        # RAIN
        # --------------------------------------------------------

        "rain_status":
            flood["rain_status"],

        "rain_condition":
            flood["rain_condition"],


        # --------------------------------------------------------
        # TEMPERATURE
        # --------------------------------------------------------

        "temperature_status":
            fire["temperature_status"],


        # --------------------------------------------------------
        # HUMIDITY
        # --------------------------------------------------------

        "humidity_status":
            fire["humidity_status"],


        # --------------------------------------------------------
        # MQ-2
        # --------------------------------------------------------

        "gas_status":
            fire["gas_status"],

        "smoke_status":
            fire["smoke_status"],


        # --------------------------------------------------------
        # PM2.5
        # --------------------------------------------------------

        "pm25_status":
            air["pm25_status"],
    }


# ============================================================
# BACKWARD-COMPATIBLE SIMPLE FUNCTION
# ============================================================
#
# route.py can call this function when it only needs the final
# risk score and level.
#
# ============================================================

def calculate_risk(
    water_level: Optional[float] = None,
    rainfall: Optional[float] = None,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    smoke: Optional[float] = None,
    gas: Optional[float] = None,
    pm25: Optional[float] = None,
) -> Dict[str, Any]:

    result = evaluate_environmental_risk(
        water_level=water_level,
        rainfall=rainfall,
        temperature=temperature,
        humidity=humidity,
        smoke=smoke,
        gas=gas,
        pm25=pm25,
    )

    return {
        "risk_score":
            result["risk_score"],

        "risk_level":
            result["risk_level"],
    }