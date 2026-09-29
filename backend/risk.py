# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# CENTRAL RISK ENGINE
# ============================================================

RISK_PRIORITY = {
    "UNKNOWN": -1,
    "SAFE": 0,
    "MEDIUM": 1,
    "CRITICAL": 2,
}


RISK_SCORE = {
    "UNKNOWN": 0.0,
    "SAFE": 25.0,
    "MEDIUM": 60.0,
    "CRITICAL": 90.0,
}


# ============================================================
# HELPERS
# ============================================================

def to_float(value):
    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def highest_risk(*levels):
    valid = [
        level
        for level in levels
        if level in RISK_PRIORITY
        and level != "UNKNOWN"
    ]

    if not valid:
        return "UNKNOWN"

    return max(
        valid,
        key=lambda level: RISK_PRIORITY[level]
    )


# ============================================================
# WATER LEVEL
# ============================================================

def classify_water_level(value):
    water_level = to_float(value)

    if water_level is None:
        return "UNKNOWN"

    if water_level <= 90.0:
        return "SAFE"

    if water_level <= 110.0:
        return "MEDIUM"

    return "CRITICAL"


# ============================================================
# RAIN SENSOR
# ============================================================
#
# ADC < 1500       -> CRITICAL
# ADC 1500 - 3500  -> MEDIUM
# ADC > 3500       -> SAFE
#
# ============================================================

def classify_rain(value):
    rainfall = to_float(value)

    if rainfall is None:
        return "UNKNOWN"

    if rainfall < 1500.0:
        return "CRITICAL"

    if rainfall <= 3500.0:
        return "MEDIUM"

    return "SAFE"


def get_rain_condition(value):
    rainfall = to_float(value)

    if rainfall is None:
        return "UNAVAILABLE"

    if rainfall < 1500.0:
        return "CRITICAL"

    if rainfall <= 3500.0:
        return "MEDIUM"

    return "SAFE"


# ============================================================
# TEMPERATURE
# ============================================================

def classify_temperature(value):
    temperature = to_float(value)

    if temperature is None:
        return "UNKNOWN"

    if temperature < 25.0:
        return "SAFE"

    if temperature <= 30.0:
        return "MEDIUM"

    return "CRITICAL"


# ============================================================
# MQ-2 GAS / SMOKE
# ============================================================

def classify_gas(value):
    gas = to_float(value)

    if gas is None:
        return "UNKNOWN"

    if gas < 700.0:
        return "SAFE"

    if gas <= 1200.0:
        return "MEDIUM"

    return "CRITICAL"


def classify_smoke(value):
    return classify_gas(value)


# ============================================================
# PM2.5
# ============================================================

def classify_pm25(value):
    pm25 = to_float(value)

    if pm25 is None:
        return "UNKNOWN"

    if pm25 <= 60.0:
        return "SAFE"

    if pm25 <= 120.0:
        return "MEDIUM"

    return "CRITICAL"


# ============================================================
# HUMIDITY
# ============================================================

def humidity_status(value):
    humidity = to_float(value)

    if humidity is None:
        return "UNKNOWN"

    return "DISPLAY_ONLY"


# ============================================================
# MAIN RISK FUNCTION
# ============================================================

def evaluate_environmental_risk(
    water_level=None,
    rainfall=None,
    temperature=None,
    humidity=None,
    smoke=None,
    gas=None,
    pm25=None,
):
    water_level_status = classify_water_level(
        water_level
    )

    rain_status = classify_rain(
        rainfall
    )

    temperature_status = classify_temperature(
        temperature
    )

    humidity_state = humidity_status(
        humidity
    )

    smoke_status = classify_smoke(
        smoke
    )

    gas_status = classify_gas(
        gas
    )

    pm25_status = classify_pm25(
        pm25
    )

    # ========================================================
    # FLOOD RISK
    # ========================================================

    flood_risk = highest_risk(
        water_level_status,
        rain_status,
    )

    # ========================================================
    # FIRE RISK
    # ========================================================

    fire_risk = highest_risk(
        temperature_status,
        smoke_status,
        gas_status,
    )

    # ========================================================
    # AIR RISK
    # ========================================================

    air_risk = highest_risk(
        gas_status,
        pm25_status,
    )

    # ========================================================
    # OVERALL RISK
    # ========================================================

    risk_level = highest_risk(
        flood_risk,
        fire_risk,
        air_risk,
    )

    risk_score = RISK_SCORE.get(
        risk_level,
        0.0
    )

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,

        "flood_risk": flood_risk,
        "fire_risk": fire_risk,
        "air_risk": air_risk,

        "water_level_status": water_level_status,

        "rain_status": rain_status,

        "rain_condition":
            get_rain_condition(
                rainfall
            ),

        "temperature_status":
            temperature_status,

        "humidity_status":
            humidity_state,

        "smoke_status":
            smoke_status,

        "gas_status":
            gas_status,

        "pm25_status":
            pm25_status,
    }