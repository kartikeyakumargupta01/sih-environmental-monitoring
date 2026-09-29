# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# AUTHENTICATION ROUTES
# ============================================================

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import User

from schemas import (
    UserRegister,
    UserLogin,
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


# ============================================================
# EMAIL NORMALIZATION
# ============================================================

def normalize_email(
    email: str
) -> str:

    return (
        email
        .strip()
        .lower()
    )


# ============================================================
# AUTHENTICATION ERROR
# ============================================================

def invalid_credentials():

    return HTTPException(

        status_code=
        status.HTTP_401_UNAUTHORIZED,

        detail=
        "Invalid email or password",

        headers={
            "WWW-Authenticate":
                "Bearer"
        }
    )


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    status_code=
        status.HTTP_201_CREATED
)
def register_user(

    payload: UserRegister,

    db: Session =
        Depends(get_db)

):

    # --------------------------------------------------------
    # CLEAN INPUT
    # --------------------------------------------------------

    name = (
        payload.name
        .strip()
    )


    email = normalize_email(
        payload.email
    )


    # --------------------------------------------------------
    # CHECK EXISTING USER
    # --------------------------------------------------------

    existing_user = (

        db.query(User)

        .filter(
            User.email ==
            email
        )

        .first()
    )


    if existing_user:

        raise HTTPException(

            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Email already registered"
        )


    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------

    user = User(

        name=
            name,

        email=
            email,

        password_hash=
            hash_password(
                payload.password
            ),

        is_active=
            True
    )


    db.add(
        user
    )


    # --------------------------------------------------------
    # SAVE USER
    # --------------------------------------------------------
    #
    # IntegrityError protects against a rare case where two
    # registrations for the same email arrive simultaneously.
    #
    # --------------------------------------------------------

    try:

        db.commit()

        db.refresh(
            user
        )


    except IntegrityError:

        db.rollback()

        raise HTTPException(

            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Email already registered"
        )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "id":
            user.id,

        "name":
            user.name,

        "email":
            user.email,

        "is_active":
            user.is_active,

        "created_at":
            user.created_at,
    }


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login"
)
def login_user(

    payload: UserLogin,

    db: Session =
        Depends(get_db)

):

    # --------------------------------------------------------
    # NORMALIZE EMAIL
    # --------------------------------------------------------

    email = normalize_email(
        payload.email
    )


    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = (

        db.query(User)

        .filter(
            User.email ==
            email
        )

        .first()
    )


    # --------------------------------------------------------
    # INVALID EMAIL
    # --------------------------------------------------------

    if user is None:

        raise invalid_credentials()


    # --------------------------------------------------------
    # INVALID PASSWORD
    # --------------------------------------------------------

    if not verify_password(

        payload.password,

        user.password_hash

    ):

        raise invalid_credentials()


    # --------------------------------------------------------
    # DISABLED ACCOUNT
    # --------------------------------------------------------

    if not user.is_active:

        raise HTTPException(

            status_code=
                status.HTTP_403_FORBIDDEN,

            detail=
                "User account disabled"
        )


    # --------------------------------------------------------
    # CREATE ACCESS TOKEN
    # --------------------------------------------------------

    access_token = (
        create_access_token(

            user.id,

            user.email
        )
    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "access_token":
            access_token,

        "token_type":
            "bearer",

        "user": {

            "id":
                user.id,

            "name":
                user.name,

            "email":
                user.email,

            "is_active":
                user.is_active
        }
    }


# ============================================================
# CURRENT AUTHENTICATED USER
# ============================================================

@router.get(
    "/me"
)
def get_me(

    current_user: User =
        Depends(
            get_current_user
        )

):

    return {

        "id":
            current_user.id,

        "name":
            current_user.name,

        "email":
            current_user.email,

        "is_active":
            current_user.is_active,

        "created_at":
            current_user.created_at,
    }