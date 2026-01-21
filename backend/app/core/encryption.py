"""
Token encryption utilities.

Uses Fernet symmetric encryption to securely store OAuth tokens.
"""
from cryptography.fernet import Fernet
from app.core.config import settings
import base64
import hashlib


def get_encryption_key() -> bytes:
    """
    Derive an encryption key from the secret key in settings.
    
    Returns a consistent 32-byte key suitable for Fernet encryption.
    """
    # Use the secret key from settings to derive a Fernet-compatible key
    key_material = settings.SECRET_KEY.encode()
    # Hash to get consistent 32 bytes
    hashed = hashlib.sha256(key_material).digest()
    # Base64 encode for Fernet
    return base64.urlsafe_b64encode(hashed)


def encrypt_token(token: str) -> str:
    """
    Encrypt an OAuth access token for storage.
    
    Args:
        token: The plaintext OAuth token
        
    Returns:
        Encrypted token as a string
    """
    f = Fernet(get_encryption_key())
    encrypted = f.encrypt(token.encode())
    return encrypted.decode()


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt a stored OAuth access token.
    
    Args:
        encrypted_token: The encrypted token string
        
    Returns:
        Decrypted plaintext token
    """
    f = Fernet(get_encryption_key())
    decrypted = f.decrypt(encrypted_token.encode())
    return decrypted.decode()
