import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, get_db
from models import User, ResetToken
from schemas import (
    SignupRequest,
    LoginRequest,
    GoogleAuthRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthResponse,
    UserResponse,
    MessageResponse,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    verify_google_token,
    generate_reset_token,
    hash_token,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Validade Auth API", version="1.0.0")

security = HTTPBearer()

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8081,http://localhost:19006,exp://localhost:19000",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
        )
    return user


def _build_auth_response(user: User) -> AuthResponse:
    token = create_access_token(user.id)
    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            created_at=user.created_at.isoformat(),
        ),
    )


@app.post("/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        or_(User.email == req.email, User.google_id.isnot(None))
    ).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado",
        )

    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _build_auth_response(user)


@app.post("/auth/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
        )

    return _build_auth_response(user)


@app.post("/auth/google", response_model=AuthResponse)
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    google_data = verify_google_token(req.id_token)
    if not google_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token do Google inválido",
        )

    google_id = google_data["google_id"]
    email = google_data["email"]
    name = google_data["name"]

    user = db.query(User).filter(
        or_(User.google_id == google_id, User.email == email)
    ).first()

    if user:
        if not user.google_id:
            user.google_id = google_id
        user.name = name
        db.commit()
        db.refresh(user)
    else:
        user = User(
            name=name,
            email=email,
            google_id=google_id,
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return _build_auth_response(user)


@app.post("/auth/forgot-password", response_model=MessageResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()

    if user:
        raw_token = generate_reset_token()
        token_hash_value = hash_token(raw_token)

        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        reset_entry = ResetToken(
            user_id=user.id,
            token_hash=token_hash_value,
            expires_at=expires_at,
        )
        db.add(reset_entry)
        db.commit()

        print(f"\n{'='*60}")
        print(f"  LINK DE RECUPERAÇÃO DE SENHA")
        print(f"  Email: {user.email}")
        print(f"  Token: {raw_token}")
        print(f"  Link: http://localhost:8000/auth/reset-password?token={raw_token}")
        print(f"  Expira em: 1 hora")
        print(f"{'='*60}\n")

    return MessageResponse(
        message="Se o e-mail estiver cadastrado, você receberá um link de recuperação"
    )


@app.post("/auth/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash_value = hash_token(req.token)

    reset_entry = (
        db.query(ResetToken)
        .filter(
            ResetToken.token_hash == token_hash_value,
            ResetToken.used == False,
            ResetToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if not reset_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado",
        )

    user = db.query(User).filter(User.id == reset_entry.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    user.password_hash = hash_password(req.new_password)
    reset_entry.used = True
    db.commit()

    return MessageResponse(message="Senha redefinida com sucesso")


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        created_at=current_user.created_at.isoformat(),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
