"""
Celery tasks package.
"""
from app.tasks.document_repo import document_repository

__all__ = ["document_repository"]
