from typing import List


# ============================================================
# RAIN SENSOR ADC THRESHOLDS
# ============================================================

RAIN_MEDIUM_MIN = 1500
RAIN_SAFE_MIN = 3500


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def level_priority(level: str) -> int:
    mapping = {
        "UNKNOWN": -1,
        "SAFE": 0,
        "MEDIUM": 1,
        "CRITICAL": 2
    }
    return mapping.get(level, -1)


def level_score(level: str) -> float:
    mapping = {
        "SAFE": 30.0,
        "MEDIUM": 65.0,
        "CRITICAL": 95.0
    }
    return mapping.get(level, 0.0)


def combine_levels(levels: List[str]) -> str:
    valid_levels = [
        level for level in levels
        if level != "UNKNOWN"
    ]

    if not valid_levels:
        return "SAFE"

    highest = "SAFE"

    for level in valid_levels:
        if level_priority(level) > level_priority(highest):
            highest = level

    return highest


# ============================================================
# FLOOD CLASSIFICATION
# ============================================================

def classify_water_level(water_level):
    if water_level is None:
        return "UNKNOWN"

    water_level = float(water_level)

    # Arduino logic:
    # <= 90     -> SAFE
    # <= 110    -> MEDIUM
    # > 110     -> CRITICAL

    if water_level <= 90:
        return "SAFE"

    if water_level <= 110:
        return "MEDIUM"

    return "CRITICAL"


def classify_rain(rainfall):
    if rainfall is None:
        return "UNKNOWN"

    rainfall = float(rainfall)

    # New rain ADC logic:
    # < 1500        -> CRITICAL
    # 1500 to 3500  -> MEDIUM
    # > 3500        -> SAFE

    if rainfall > RAIN_SAFE_MIN:
        return "SAFE"

    if rainfall >= RAIN_MEDIUM_MIN:
        return "MEDIUM"

    return "CRITICAL"


def get_rain_condition(rainfall):
    if rainfall is None:
        return "UNAVAILABLE"

    rainfall = float(rainfall)

    if rainfall > RAIN_SAFE_MIN:
        return "SAFE"

    if rainfall >= RAIN_MEDIUM_MIN:
        return "MEDIUM"

    return "CRITICAL"


# ============================================================
# TEMPERATURE / FIRE CLASSIFICATION
# ============================================================

def classify_temperature(temperature):
    if temperature is None:
        return "UNKNOWN"

    temperature = float(temperature)

    # Arduino logic:
    # < 25      -> SAFE
    # <= 30     -> MEDIUM
    # > 30      -> CRITICAL

    if temperature < 25:
        return "SAFE"

    if temperature <= 30:
        return "MEDIUM"

    return "CRITICAL"


def classify_smoke(smoke):
    if smoke is None:
        return "UNKNOWN"

    smoke = float(smoke)

    # MQ-2 type logic:
    # < 700      -> SAFE
    # <= 1200    -> MEDIUM
    # > 1200     -> CRITICAL

    if smoke < 700:
        return "SAFE"

    if smoke <= 1200:
        return "MEDIUM"

    return "CRITICAL"


def classify_gas(gas):
    if gas is None:
        return "UNKNOWN"

    gas = float(gas)

    if gas < 700:
        return "SAFE"

    if gas <= 1200:
        return "MEDIUM"

    return "CRITICAL"


# ============================================================
# AIR QUALITY CLASSIFICATION
# ============================================================

def classify_pm25(pm25):
    if pm25 is None:
        return "UNKNOWN"

    pm25 = float(pm25)

    # General demo thresholds
    if pm25 <= 60:
        return "SAFE"

    if pm25 <= 120:
        return "MEDIUM"

    return "CRITICAL"


# ============================================================
# MAIN RISK CALCULATION
# ============================================================

def calculate_risk(payload):
    hazard_type = (
        payload.hazard_type.lower().strip()
        if payload.hazard_type
        else "environment"
    )

    water_level_status = classify_water_level(
        payload.water_level
    )

    rain_status = classify_rain(
        payload.rainfall
    )

    temperature_status = classify_temperature(
        payload.temperature
    )

    smoke_status = classify_smoke(
        payload.smoke
    )

    gas_status = classify_gas(
        payload.gas
    )

    pm25_status = classify_pm25(
        payload.pm25
    )

    # --------------------------------------------------------
    # FLOOD
    # --------------------------------------------------------

    flood_levels = [
        water_level_status,
        rain_status
    ]

    flood_risk = combine_levels(
        flood_levels
    )

    # --------------------------------------------------------
    # FOREST FIRE
    # --------------------------------------------------------

    fire_levels = [
        temperature_status,
        smoke_status,
        gas_status
    ]

    fire_risk = combine_levels(
        fire_levels
    )

    # --------------------------------------------------------
    # AIR QUALITY
    # --------------------------------------------------------

    air_levels = [
        gas_status,
        pm25_status,
        temperature_status
    ]

    air_risk = combine_levels(
        air_levels
    )

    # --------------------------------------------------------
    # FINAL HAZARD TYPE
    # --------------------------------------------------------

    if hazard_type == "flood":
        selected_levels = flood_levels
        final_risk = flood_risk

    elif hazard_type in ["fire", "forest_fire", "wildfire"]:
        selected_levels = fire_levels
        final_risk = fire_risk

    elif hazard_type in ["air", "air_quality", "pollution"]:
        selected_levels = air_levels
        final_risk = air_risk

    else:
        # environment / combined node
        selected_levels = [
            water_level_status,
            rain_status,
            temperature_status,
            smoke_status,
            gas_status,
            pm25_status
        ]

        final_risk = combine_levels(
            selected_levels
        )

    # --------------------------------------------------------
    # SCORE CALCULATION
    # --------------------------------------------------------

    valid_levels = [
        level for level in selected_levels
        if level != "UNKNOWN"
    ]

    if not valid_levels:
        risk_score = 0.0
    else:
        risk_score = round(
            sum(level_score(level) for level in valid_levels)
            / len(valid_levels),
            1
        )

    return risk_score, final_risk