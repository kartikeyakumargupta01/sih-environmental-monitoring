# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# EMAIL ALERT SERVICE
# ============================================================

import os
import smtplib
import ssl

from email.message import EmailMessage
from email.utils import formataddr

from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


# ============================================================
# SMTP CONFIGURATION
# ============================================================

SMTP_HOST = os.getenv(
    "SMTP_HOST",
    "smtp.gmail.com"
).strip()


SMTP_PORT = int(
    os.getenv(
        "SMTP_PORT",
        "587"
    )
)


SMTP_EMAIL = (
    os.getenv(
        "SMTP_EMAIL"
    )
    or ""
).strip()


SMTP_PASSWORD = (
    os.getenv(
        "SMTP_PASSWORD"
    )
    or ""
).strip()


DEFAULT_ALERT_EMAIL = (
    os.getenv(
        "ALERT_EMAIL"
    )
    or ""
).strip()


SMTP_FROM_NAME = (
    os.getenv(
        "SMTP_FROM_NAME",
        "Environmental Prediction System"
    )
    or "Environmental Prediction System"
).strip()


# ============================================================
# SMTP TIMEOUT
# ============================================================

SMTP_TIMEOUT = 15


# ============================================================
# VALIDATE EMAIL CONFIGURATION
# ============================================================

def validate_email_configuration(
    destination: str
) -> bool:

    if not SMTP_EMAIL:

        print(
            "[EMAIL] SMTP_EMAIL "
            "is not configured."
        )

        return False


    if not SMTP_PASSWORD:

        print(
            "[EMAIL] SMTP_PASSWORD "
            "is not configured."
        )

        return False


    if not destination:

        print(
            "[EMAIL] No alert recipient "
            "is configured."
        )

        return False


    return True


# ============================================================
# SEND ALERT EMAIL
# ============================================================
#
# Returns:
#
# True
#     email successfully sent
#
# False
#     configuration error or SMTP failure
#
# ============================================================

def send_alert_email(
    subject: str,
    message: str,
    recipient: str | None = None
) -> bool:

    # ========================================================
    # DETERMINE RECIPIENT
    # ========================================================

    destination = (
        recipient
        or DEFAULT_ALERT_EMAIL
    )

    destination = (
        destination
        or ""
    ).strip()


    # ========================================================
    # VALIDATE CONFIGURATION
    # ========================================================

    if not validate_email_configuration(
        destination
    ):

        return False


    # ========================================================
    # CLEAN SUBJECT
    # ========================================================

    subject = (
        subject
        or "Environmental Alert"
    ).strip()


    # ========================================================
    # CLEAN MESSAGE
    # ========================================================

    message = (
        message
        or "Environmental alert detected."
    )


    # ========================================================
    # BUILD EMAIL
    # ========================================================

    email = EmailMessage()


    email["From"] = formataddr(
        (
            SMTP_FROM_NAME,
            SMTP_EMAIL
        )
    )


    email["To"] = destination


    email["Subject"] = subject


    # --------------------------------------------------------
    # UTF-8 plain-text email
    # --------------------------------------------------------

    email.set_content(
        message,
        subtype="plain",
        charset="utf-8"
    )


    # ========================================================
    # TLS SECURITY CONTEXT
    # ========================================================

    tls_context = (
        ssl.create_default_context()
    )


    # ========================================================
    # SEND EMAIL
    # ========================================================

    try:

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT,
            timeout=SMTP_TIMEOUT
        ) as smtp:

            # ------------------------------------------------
            # Connect to SMTP server
            # ------------------------------------------------

            smtp.ehlo()


            # ------------------------------------------------
            # Secure connection using STARTTLS
            # ------------------------------------------------

            smtp.starttls(
                context=tls_context
            )


            smtp.ehlo()


            # ------------------------------------------------
            # Gmail authentication
            # ------------------------------------------------

            smtp.login(
                SMTP_EMAIL,
                SMTP_PASSWORD
            )


            # ------------------------------------------------
            # Send message
            # ------------------------------------------------

            smtp.send_message(
                email
            )


        print(
            f"[EMAIL] Alert email sent "
            f"to {destination}"
        )


        return True


    # ========================================================
    # AUTHENTICATION ERROR
    # ========================================================

    except smtplib.SMTPAuthenticationError:

        print(
            "[EMAIL] Gmail authentication "
            "failed. Check SMTP_EMAIL and "
            "SMTP_PASSWORD / App Password."
        )

        return False


    # ========================================================
    # RECIPIENT ERROR
    # ========================================================

    except smtplib.SMTPRecipientsRefused:

        print(
            f"[EMAIL] Recipient refused: "
            f"{destination}"
        )

        return False


    # ========================================================
    # SMTP CONNECTION ERROR
    # ========================================================

    except smtplib.SMTPException as error:

        print(
            "[EMAIL] SMTP error:",
            error
        )

        return False


    # ========================================================
    # NETWORK / OTHER ERROR
    # ========================================================

    except Exception as error:

        print(
            "[EMAIL] Email sending failed:",
            error
        )

        return False