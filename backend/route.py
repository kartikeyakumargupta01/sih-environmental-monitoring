# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# SENSOR / DASHBOARD / ALERT ROUTES
# ============================================================

import os

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db

from models import (
    Alert,
    SensorReading,
)

from schemas import SensorReadingCreate

from risk import evaluate_environmental_risk

from email_service import send_alert_email


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api",
    tags=["Sensor Monitoring"]
)


# ============================================================
# SETTINGS
# ============================================================

OFFLINE_AFTER_SECONDS = 12

EMAIL_COOLDOWN_MINUTES = 15


APP_TIMEZONE_NAME = os.getenv(
    "APP_TIMEZONE",
    "Asia/Kolkata"
)


try:

    APP_TIMEZONE = ZoneInfo(
        APP_TIMEZONE_NAME
    )

except Exception:

    APP_TIMEZONE = timezone.utc


# ============================================================
# RISK PRIORITY
# ============================================================

RISK_PRIORITY = {
    "UNKNOWN": -1,
    "SAFE": 0,
    "MEDIUM": 1,
    "CRITICAL": 2,
}


# ============================================================
# TIME HELPERS
# ============================================================

def utc_now():

    return datetime.now(
        timezone.utc
    )


def ensure_utc(
    value
):

    if value is None:

        return None


    if value.tzinfo is None:

        return value.replace(
            tzinfo=timezone.utc
        )


    return value.astimezone(
        timezone.utc
    )


def format_local_time(
    value
):

    value = ensure_utc(
        value
    )


    if value is None:

        return "Unknown"


    local_time = value.astimezone(
        APP_TIMEZONE
    )


    return local_time.strftime(
        "%d %b %Y, %I:%M:%S %p %Z"
    )


# ============================================================
# ONLINE / OFFLINE
# ============================================================

def is_reading_online(
    reading
):

    if reading is None:

        return False


    created_at = ensure_utc(
        reading.created_at
    )


    if created_at is None:

        return False


    age = (
        utc_now()
        -
        created_at
    ).total_seconds()


    return (
        0
        <= age
        <= OFFLINE_AFTER_SECONDS
    )


# ============================================================
# EVALUATE READING
# ============================================================

def evaluate_reading_values(
    reading
):

    return evaluate_environmental_risk(

        water_level=
            reading.water_level,

        rainfall=
            reading.rainfall,

        temperature=
            reading.temperature,

        humidity=
            reading.humidity,

        smoke=
            reading.smoke,

        gas=
            reading.gas,

        pm25=
            reading.pm25,
    )


# ============================================================
# SERIALIZE READING
# ============================================================

def serialize_reading(
    reading
):

    if reading is None:

        return None


    risk = evaluate_reading_values(
        reading
    )


    online = is_reading_online(
        reading
    )


    return {

        "id":
            reading.id,

        "node_id":
            reading.node_id,

        "hazard_type":
            reading.hazard_type,


        "water_level":
            reading.water_level,

        "rainfall":
            reading.rainfall,

        "temperature":
            reading.temperature,

        "humidity":
            reading.humidity,

        "smoke":
            reading.smoke,

        "gas":
            reading.gas,

        "pm25":
            reading.pm25,


        "risk_score":
            reading.risk_score,

        "risk_level":
            reading.risk_level,


        "flood_risk":
            risk["flood_risk"],

        "fire_risk":
            risk["fire_risk"],

        "air_risk":
            risk["air_risk"],


        "water_level_status":
            risk["water_level_status"],

        "rain_status":
            risk["rain_status"],

        "rain_condition":
            risk["rain_condition"],

        "temperature_status":
            risk["temperature_status"],

        "humidity_status":
            risk["humidity_status"],

        "gas_status":
            risk["gas_status"],

        "smoke_status":
            risk["smoke_status"],

        "pm25_status":
            risk["pm25_status"],


        "online":
            online,

        "node_status":
            (
                "ONLINE"
                if online
                else "OFFLINE"
            ),


        "created_at":
            reading.created_at,
    }


# ============================================================
# BUILD ALERT MESSAGE
# ============================================================

def build_alert_message(
    hazard_type,
    severity,
    payload,
    risk
):

    if hazard_type == "flood":

        return (
            f"Flood condition at "
            f"{payload.node_id}. "
            f"Severity: {severity}. "
            f"Water level: "
            f"{payload.water_level} cm. "
            f"Rain sensor: "
            f"{payload.rainfall} ADC "
            f"({risk['rain_condition']})."
        )


    if hazard_type == "fire":

        return (
            f"Forest fire condition at "
            f"{payload.node_id}. "
            f"Severity: {severity}. "
            f"Temperature: "
            f"{payload.temperature} °C. "
            f"MQ-2 gas: "
            f"{payload.gas}."
        )


    if hazard_type == "air":

        pm_text = (
            "Unavailable"
            if payload.pm25 is None
            else f"{payload.pm25} µg/m³"
        )


        return (
            f"Air quality condition at "
            f"{payload.node_id}. "
            f"Severity: {severity}. "
            f"MQ-2 gas: "
            f"{payload.gas}. "
            f"PM2.5: {pm_text}."
        )


    return (
        f"Environmental condition at "
        f"{payload.node_id}. "
        f"Severity: {severity}."
    )


# ============================================================
# GET HAZARD RISKS
# ============================================================

def get_hazard_risks(
    risk
):

    return {

        "flood":
            risk["flood_risk"],

        "fire":
            risk["fire_risk"],

        "air":
            risk["air_risk"],
    }


# ============================================================
# SHOULD CREATE ALERT
# ============================================================
#
# Alert only when risk ESCALATES.
#
# SAFE -> MEDIUM
# SAFE -> CRITICAL
# MEDIUM -> CRITICAL
#
# No duplicate alert for:
#
# MEDIUM -> MEDIUM
# CRITICAL -> CRITICAL
# CRITICAL -> MEDIUM
#
# ============================================================

def should_create_alert(
    previous_level,
    current_level
):

    current_priority = (
        RISK_PRIORITY.get(
            current_level,
            -1
        )
    )


    previous_priority = (
        RISK_PRIORITY.get(
            previous_level,
            -1
        )
    )


    if current_level not in (
        "MEDIUM",
        "CRITICAL"
    ):

        return False


    return (
        current_priority
        >
        previous_priority
    )


# ============================================================
# FIND RECENT CRITICAL ALERT
# ============================================================

def find_recent_critical_alert(
    db,
    node_id
):

    cooldown_start = (
        utc_now()
        -
        timedelta(
            minutes=
                EMAIL_COOLDOWN_MINUTES
        )
    )


    return (

        db.query(Alert)

        .filter(

            Alert.node_id
            ==
            node_id,

            Alert.severity
            ==
            "CRITICAL",

            Alert.created_at
            >=
            cooldown_start
        )

        .order_by(
            Alert.created_at.desc()
        )

        .first()
    )


# ============================================================
# GET PREVIOUS READING
# ============================================================

def get_previous_reading(
    db,
    node_id
):

    return (

        db.query(
            SensorReading
        )

        .filter(
            SensorReading.node_id
            ==
            node_id
        )

        .order_by(
            SensorReading.created_at.desc()
        )

        .first()
    )


# ============================================================
# CREATE SENSOR READING
# ============================================================

@router.post(
    "/readings",
    status_code=201
)
def create_sensor_reading(

    payload: SensorReadingCreate,

    db: Session =
        Depends(get_db)

):

    # ========================================================
    # EVENT TIME
    # ========================================================

    event_time = utc_now()


    # ========================================================
    # GET PREVIOUS SENSOR STATE
    # ========================================================
    #
    # Must happen BEFORE the new reading is inserted.
    #
    # ========================================================

    previous_reading = (
        get_previous_reading(
            db,
            payload.node_id
        )
    )


    previous_risk = None

    previous_hazard_risks = {
        "flood": "SAFE",
        "fire": "SAFE",
        "air": "SAFE",
    }


    if previous_reading is not None:

        previous_risk = (
            evaluate_reading_values(
                previous_reading
            )
        )


        previous_hazard_risks = (
            get_hazard_risks(
                previous_risk
            )
        )


    previous_overall_risk = (

        previous_reading.risk_level

        if previous_reading
        else "SAFE"
    )


    # ========================================================
    # CALCULATE CURRENT RISK
    # ========================================================

    risk = evaluate_environmental_risk(

        water_level=
            payload.water_level,

        rainfall=
            payload.rainfall,

        temperature=
            payload.temperature,

        humidity=
            payload.humidity,

        smoke=
            payload.smoke,

        gas=
            payload.gas,

        pm25=
            payload.pm25,
    )


    risk_score = (
        risk["risk_score"]
    )


    risk_level = (
        risk["risk_level"]
    )


    hazard_risks = (
        get_hazard_risks(
            risk
        )
    )


    # ========================================================
    # CHECK EMAIL COOLDOWN
    # ========================================================

    recent_critical_alert = None


    if (
        risk_level
        ==
        "CRITICAL"
    ):

        recent_critical_alert = (
            find_recent_critical_alert(
                db,
                payload.node_id
            )
        )


    # ========================================================
    # SAVE EVERY SENSOR READING
    # ========================================================
    #
    # Alerts are deduplicated.
    #
    # Sensor readings are NOT.
    #
    # Every ESP32 packet remains available for graphs/history.
    #
    # ========================================================

    reading = SensorReading(

        node_id=
            payload.node_id,

        hazard_type=
            payload.hazard_type.lower(),

        water_level=
            payload.water_level,

        rainfall=
            payload.rainfall,

        temperature=
            payload.temperature,

        humidity=
            payload.humidity,

        smoke=
            payload.smoke,

        gas=
            payload.gas,

        pm25=
            payload.pm25,

        risk_score=
            risk_score,

        risk_level=
            risk_level,

        created_at=
            event_time
    )


    db.add(
        reading
    )


    db.commit()


    db.refresh(
        reading
    )


    # ========================================================
    # CREATE TRANSITION ALERTS
    # ========================================================

    created_alerts = []


    for (
        hazard_name,
        current_level
    ) in hazard_risks.items():


        previous_level = (
            previous_hazard_risks.get(
                hazard_name,
                "SAFE"
            )
        )


        create_alert = (
            should_create_alert(

                previous_level=
                    previous_level,

                current_level=
                    current_level
            )
        )


        if not create_alert:

            continue


        alert_message = (
            build_alert_message(

                hazard_type=
                    hazard_name,

                severity=
                    current_level,

                payload=
                    payload,

                risk=
                    risk
            )
        )


        alert = Alert(

            node_id=
                payload.node_id,

            hazard_type=
                hazard_name,

            severity=
                current_level,

            message=
                alert_message,

            created_at=
                event_time
        )


        db.add(
            alert
        )


        created_alerts.append(
            alert
        )


        print(
            "[ALERT] "
            f"{hazard_name.upper()} "
            f"{previous_level} -> "
            f"{current_level}"
        )


    # ========================================================
    # COMMIT ALERTS
    # ========================================================

    if created_alerts:

        db.commit()


        for alert in created_alerts:

            db.refresh(
                alert
            )


    # ========================================================
    # EMAIL TRANSITION CHECK
    # ========================================================
    #
    # Email only when overall environment ENTERS CRITICAL.
    #
    # A sustained CRITICAL condition does not resend email.
    #
    # If environment recovers and later becomes CRITICAL again,
    # email may be sent again subject to the 15-minute cooldown.
    #
    # ========================================================

    entered_critical = (

        risk_level
        ==
        "CRITICAL"

        and

        previous_overall_risk
        !=
        "CRITICAL"
    )


    if entered_critical:


        if recent_critical_alert is None:


            critical_hazards = [

                hazard.upper()

                for hazard, level
                in hazard_risks.items()

                if level
                ==
                "CRITICAL"
            ]


            hazard_text = (

                ", ".join(
                    critical_hazards
                )

                if critical_hazards

                else "ENVIRONMENT"
            )


            subject = (

                f"[CRITICAL] "
                f"{hazard_text} "
                f"Alert - "
                f"{payload.node_id}"
            )


            recorded_time = (
                format_local_time(
                    reading.created_at
                )
            )


            email_message = (

                "CRITICAL environmental "
                "condition detected.\n\n"

                f"Node: "
                f"{payload.node_id}\n"

                f"Recorded Time: "
                f"{recorded_time}\n\n"

                f"Overall Risk Score: "
                f"{risk_score}/100\n"

                f"Overall Risk Level: "
                f"{risk_level}\n\n"


                "Hazard Assessment:\n"

                f"Flood: "
                f"{risk['flood_risk']}\n"

                f"Fire: "
                f"{risk['fire_risk']}\n"

                f"Air Quality: "
                f"{risk['air_risk']}\n\n"


                "Sensor Readings:\n"

                f"Water Level: "
                f"{payload.water_level} cm\n"

                f"Rain Sensor: "
                f"{payload.rainfall} ADC\n"

                f"Rain Condition: "
                f"{risk['rain_condition']}\n"

                f"Temperature: "
                f"{payload.temperature} °C\n"

                f"Humidity: "
                f"{payload.humidity} %\n"

                f"Smoke: "
                f"{payload.smoke}\n"

                f"Gas: "
                f"{payload.gas}\n"

                f"PM2.5: "
                f"{payload.pm25}\n\n"

                "Immediate attention "
                "is required."
            )


            try:

                email_sent = (
                    send_alert_email(

                        subject=
                            subject,

                        message=
                            email_message
                    )
                )


                if email_sent:

                    print(
                        "[EMAIL] "
                        "CRITICAL email sent "
                        f"for {payload.node_id}"
                    )


                else:

                    print(
                        "[EMAIL] "
                        "CRITICAL email failed "
                        f"for {payload.node_id}"
                    )


            except Exception as exc:

                print(
                    "[EMAIL] "
                    "CRITICAL email error: "
                    f"{exc}"
                )


        else:

            print(
                "[EMAIL] "
                "CRITICAL email suppressed "
                f"for {payload.node_id}. "
                f"{EMAIL_COOLDOWN_MINUTES}-minute "
                "cooldown active."
            )


    # ========================================================
    # RESPONSE
    # ========================================================

    return serialize_reading(
        reading
    )


# ============================================================
# GET LATEST READING
# ============================================================

@router.get(
    "/readings/latest/{node_id}"
)
def get_latest_reading(

    node_id: str,

    db: Session =
        Depends(get_db)

):

    reading = (

        db.query(
            SensorReading
        )

        .filter(
            SensorReading.node_id
            ==
            node_id
        )

        .order_by(
            SensorReading.created_at.desc()
        )

        .first()
    )


    if reading is None:

        raise HTTPException(

            status_code=404,

            detail=(
                "No sensor reading "
                "found for this node."
            )
        )


    return serialize_reading(
        reading
    )


# ============================================================
# GET READING HISTORY
# ============================================================

@router.get(
    "/readings/{node_id}"
)
def get_node_history(

    node_id: str,

    limit: int = Query(
        default=20,
        ge=1,
        le=100
    ),

    db: Session =
        Depends(get_db)

):

    readings = (

        db.query(
            SensorReading
        )

        .filter(
            SensorReading.node_id
            ==
            node_id
        )

        .order_by(
            SensorReading.created_at.desc()
        )

        .limit(
            limit
        )

        .all()
    )


    # Graph should receive:
    #
    # oldest -> newest

    readings.reverse()


    return [

        serialize_reading(
            reading
        )

        for reading in readings
    ]


# ============================================================
# GET ALERTS
# ============================================================

@router.get(
    "/alerts"
)
def get_alerts(

    limit: int = Query(
        default=20,
        ge=1,
        le=100
    ),

    db: Session =
        Depends(get_db)

):

    alerts = (

        db.query(
            Alert
        )

        .order_by(
            Alert.created_at.desc()
        )

        .limit(
            limit
        )

        .all()
    )


    return alerts


# ============================================================
# GET LATEST ALERT
# ============================================================

@router.get(
    "/alerts/latest"
)
def get_latest_alert(

    db: Session =
        Depends(get_db)

):

    alert = (

        db.query(
            Alert
        )

        .order_by(
            Alert.created_at.desc()
        )

        .first()
    )


    if alert is None:

        return None


    return alert


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

@router.get(
    "/dashboard/summary"
)
def dashboard_summary(

    db: Session =
        Depends(get_db)

):

    # ========================================================
    # REAL DEPLOYED NODES ONLY
    # ========================================================

    node_rows = (

        db.query(
            SensorReading.node_id
        )

        .distinct()

        .all()
    )


    node_ids = [

        row[0]

        for row in node_rows
    ]


    nodes = []


    safe_count = 0

    medium_count = 0

    critical_count = 0

    offline_count = 0

    online_count = 0


    # ========================================================
    # LATEST STATE FOR EACH NODE
    # ========================================================

    for node_id in node_ids:


        reading = (

            db.query(
                SensorReading
            )

            .filter(
                SensorReading.node_id
                ==
                node_id
            )

            .order_by(
                SensorReading.created_at.desc()
            )

            .first()
        )


        if reading is None:

            continue


        node_data = (
            serialize_reading(
                reading
            )
        )


        nodes.append(
            node_data
        )


        if not node_data["online"]:

            offline_count += 1

            continue


        online_count += 1


        node_risk = (
            node_data[
                "risk_level"
            ]
        )


        if node_risk == "SAFE":

            safe_count += 1


        elif node_risk == "MEDIUM":

            medium_count += 1


        elif node_risk == "CRITICAL":

            critical_count += 1


    # ========================================================
    # OVERALL LIVE RISK
    # ========================================================

    online_risks = [

        node["risk_level"]

        for node in nodes

        if node["online"]
    ]


    if not online_risks:

        overall_risk = (
            "OFFLINE"
        )


    else:

        overall_risk = max(

            online_risks,

            key=lambda value:
                RISK_PRIORITY.get(
                    value,
                    -1
                )
        )


    # ========================================================
    # ALERTS TODAY
    # ========================================================

    local_now = datetime.now(
        APP_TIMEZONE
    )


    local_midnight = (
        local_now.replace(

            hour=0,

            minute=0,

            second=0,

            microsecond=0
        )
    )


    utc_day_start = (
        local_midnight.astimezone(
            timezone.utc
        )
    )


    alerts_today = (

        db.query(
            func.count(
                Alert.id
            )
        )

        .filter(
            Alert.created_at
            >=
            utc_day_start
        )

        .scalar()
        or 0
    )


    # ========================================================
    # LATEST PACKET
    # ========================================================

    latest_reading = (

        db.query(
            SensorReading
        )

        .order_by(
            SensorReading.created_at.desc()
        )

        .first()
    )


    latest_data = (

        serialize_reading(
            latest_reading
        )

        if latest_reading

        else None
    )


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "total_nodes":
            len(node_ids),

        "online_nodes":
            online_count,

        "offline_nodes":
            offline_count,

        "safe_nodes":
            safe_count,

        "medium_nodes":
            medium_count,

        "critical_nodes":
            critical_count,

        "alerts_today":
            alerts_today,

        "overall_risk":
            overall_risk,

        "latest_reading":
            latest_data,

        "nodes":
            nodes,
    }