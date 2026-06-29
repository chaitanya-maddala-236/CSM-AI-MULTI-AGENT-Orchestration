"""Auth routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, TokenResponse, RefreshRequest, UserOut, MessageResponse
from app.auth.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=TokenResponse)
async def signup(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(id=str(uuid.uuid4()), email=data.email, full_name=data.full_name,
                hashed_password=hash_password(data.password), role=data.role, is_active=True, is_verified=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    tokens = _create_tokens(user)
    return TokenResponse(user=UserOut.model_validate(user), **tokens)

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account deactivated")
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    tokens = _create_tokens(user)
    return TokenResponse(user=UserOut.model_validate(user), **tokens)

@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = (await db.execute(select(User).where(User.id == payload["sub"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    tokens = _create_tokens(user)
    return TokenResponse(user=UserOut.model_validate(user), **tokens)

@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    return MessageResponse(message="Logged out successfully")

def _create_tokens(user: User):
    return {"access_token": create_access_token({"sub": user.id, "role": user.role.value}),
            "refresh_token": create_refresh_token({"sub": user.id})}
