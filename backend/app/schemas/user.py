"""
Pydantic schemas for User model.
"""
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class UserBase(BaseModel):
    github_id: str
    username: str
    email: str | None = None
    name: str | None = None
    avatar_url: str | None = None


class UserCreate(UserBase):
    access_token: str  # Will be encrypted before storing


class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class UserAuth(BaseModel):
    """Schema for authenticating a user via NextAuth session"""
    github_id: str
    username: str
    access_token: str
    email: str | None = None
    name: str | None = None
    avatar_url: str | None = None
