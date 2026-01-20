from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
from uuid import UUID
from enum import Enum

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class JobCreate(BaseModel):
    github_url: str = Field(..., description="GitHub repository URL")

    class Config:
        json_schema_extra = {
            "example": {
                "github_url": "https://github.com/facebook/react"
            }
        }

class JobResponse(BaseModel):
    id: UUID
    github_url: str
    status: JobStatus
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "github_url": "https://github.com/facebook/react",
                "status": "pending",
                "error_message": None,
                "created_at": "2024-01-19T12:00:00Z",
                "updated_at": "2024-01-19T12:00:00Z"
            }
        }
