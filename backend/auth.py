# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# AUTHENTICATION / JWT UTILITIES
# ============================================================

import os

from datetime import (
    datetime,
    timedelta,
    timezone,
)

import jwt

from jwt.exceptions import (
    InvalidTokenError,
)

from dotenv import load_dotenv

from pwdlib import PasswordHash

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from sqlalchemy.orm import Session

from database import get_db
from models import User


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


# ============================================================
# JWT CONFIGURATION
# ============================================================

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256"
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "120"
    )
)


if not JWT_SECRET_KEY:

    raise RuntimeError(
        "JWT_SECRET_KEY is missing from .env"
    )


# ============================================================
# PASSWORD HASHING
# ============================================================

password_hasher = (
    PasswordHash.recommended()
)


def hash_password(
    password: str
) -> str:

    return password_hasher.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    try:

        return password_hasher.verify(
            plain_password,
            hashed_password
        )

    except Exception:

        # Invalid/corrupt stored hash should never
        # crash the authentication endpoint.

        return False


# ============================================================
# CREATE JWT ACCESS TOKEN
# ============================================================

def create_access_token(
    user_id: int,
    email: str
) -> str:

    now = datetime.now(
        timezone.utc
    )


    expires = (
        now
        +
        timedelta(
            minutes=
            ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )


    payload = {

        # User identifier
        "sub":
            str(user_id),

        # Useful frontend/backend identity claim
        "email":
            email,

        # Token type
        "type":
            "access",

        # Issued at
        "iat":
            now,

        # Expiration
        "exp":
            expires,
    }


    token = jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


    return token


# ============================================================
# BEARER AUTHENTICATION
# ============================================================
#
# auto_error=False lets us return the same clean 401 response
# when:
#
# - Authorization header is missing
# - bearer token is missing
# - token is invalid
#
# ============================================================

security = HTTPBearer(
    auto_error=False
)


# ============================================================
# UNAUTHORIZED RESPONSE
# ============================================================

def authentication_error():

    return HTTPException(

        status_code=
        status.HTTP_401_UNAUTHORIZED,

        detail=
        "Authentication required",

        headers={
            "WWW-Authenticate":
                "Bearer"
        }
    )


# ============================================================
# GET CURRENT AUTHENTICATED USER
# ============================================================

def get_current_user(

    credentials:
        HTTPAuthorizationCredentials
        | None
        =
        Depends(security),

    db: Session =
        Depends(get_db)

):

    # --------------------------------------------------------
    # MISSING AUTHORIZATION HEADER
    # --------------------------------------------------------

    if credentials is None:

        raise authentication_error()


    token = (
        credentials.credentials
    )


    if not token:

        raise authentication_error()


    # --------------------------------------------------------
    # DECODE AND VALIDATE JWT
    # --------------------------------------------------------

    try:

        payload = jwt.decode(

            token,

            JWT_SECRET_KEY,

            algorithms=[
                JWT_ALGORITHM
            ]
        )


        user_id_raw = (
            payload.get(
                "sub"
            )
        )


        token_type = (
            payload.get(
                "type",
                "access"
            )
        )


        if (
            user_id_raw is None
            or
            token_type != "access"
        ):

            raise authentication_error()


        try:

            user_id = int(
                user_id_raw
            )

        except (
            TypeError,
            ValueError
        ):

            raise authentication_error()


    except InvalidTokenError:

        raise authentication_error()


    # --------------------------------------------------------
    # LOAD USER FROM DATABASE
    # --------------------------------------------------------

    user = (

        db.query(User)

        .filter(
            User.id
            ==
            user_id
        )

        .first()
    )


    if user is None:

        raise authentication_error()


    # --------------------------------------------------------
    # ACCOUNT STATUS
    # --------------------------------------------------------

    if not user.is_active:

        raise HTTPException(

            status_code=
            status.HTTP_403_FORBIDDEN,

            detail=
            "User account disabled"
        )


    return user