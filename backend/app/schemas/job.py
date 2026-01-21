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
    github_id: str | None = Field(None, description="GitHub user ID (for authenticated users)")
    access_token: str | None = Field(None, description="GitHub access token (for checking repo access)")

    class Config:
        json_schema_extra = {
            "example": {
                "github_url": "https://github.com/facebook/react",
                "github_id": "123456",
                "access_token": "gho_xxxxxxxxxxxx"
            }
        }

class JobResponse(BaseModel):
    id: UUID
    github_url: str
    status: JobStatus
    error_message: str | None = None
    documentation_url: str | None = None
    has_write_access: bool = False
    pull_request_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "github_url": "https://github.com/facebook/react",
                "status": "completed",
                "error_message": None,
                "documentation_url": "https://my-bucket.s3.us-east-1.amazonaws.com/docs/123e4567-e89b-12d3-a456-426614174000.md",
                "has_write_access": True,
                "pull_request_url": "https://github.com/facebook/react/pull/123",
                "created_at": "2024-01-19T12:00:00Z",
                "updated_at": "2024-01-19T12:05:00Z"
            }
        }
