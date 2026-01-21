from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.core.database import Base

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    github_url = Column(String, unique=True, nullable=False, index=True)
    status = Column(SQLEnum(JobStatus, values_callable=lambda x: [e.value for e in x]), default=JobStatus.PENDING, nullable=False)
    error_message = Column(String, nullable=True)
    documentation_url = Column(String, nullable=True)

    # User association and permissions
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    has_write_access = Column(Boolean, default=False, nullable=False)
    pull_request_url = Column(String, nullable=True)  # URL to the PR if created

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship to user
    user = relationship("User", back_populates="jobs")
