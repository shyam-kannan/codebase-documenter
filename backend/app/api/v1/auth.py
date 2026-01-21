"""
Authentication endpoints for user management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserAuth, UserResponse
from app.core.encryption import encrypt_token
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/auth/login", response_model=UserResponse)
async def login_or_create_user(user_data: UserAuth, db: Session = Depends(get_db)):
    """
    Login or create a user from NextAuth session data.
    
    This endpoint receives the GitHub OAuth data from the frontend
    and creates or updates the user record with the encrypted access token.
    """
    try:
        # Check if user exists
        user = db.query(User).filter(User.github_id == user_data.github_id).first()
        
        # Encrypt the access token
        encrypted_token = encrypt_token(user_data.access_token)
        
        if user:
            # Update existing user
            user.username = user_data.username
            user.email = user_data.email
            user.name = user_data.name
            user.avatar_url = user_data.avatar_url
            user.encrypted_access_token = encrypted_token
            logger.info(f"Updated user: {user.username}")
        else:
            # Create new user
            user = User(
                github_id=user_data.github_id,
                username=user_data.username,
                email=user_data.email,
                name=user_data.name,
                avatar_url=user_data.avatar_url,
                encrypted_access_token=encrypted_token
            )
            db.add(user)
            logger.info(f"Created new user: {user_data.username}")
        
        db.commit()
        db.refresh(user)
        
        return user
        
    except Exception as e:
        logger.error(f"Error in login_or_create_user: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to authenticate user"
        )


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user(github_id: str, db: Session = Depends(get_db)):
    """
    Get the current user's information by their GitHub ID.
    
    Query param:
    - github_id: The user's GitHub ID from the session
    """
    user = db.query(User).filter(User.github_id == github_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user
