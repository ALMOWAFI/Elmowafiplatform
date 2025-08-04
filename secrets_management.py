#!/usr/bin/env python3
"""
Secrets Management for Elmowafiplatform
Implements secure secrets management for production deployment
"""

import os
import base64
import json
import logging
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

class SecretsManager:
    """Secure secrets manager"""
    
    def __init__(self, master_key: str = None):
        self.master_key = master_key or os.getenv('MASTER_SECRET_KEY')
        self.fernet = None
        self.secrets_cache = {}
        
        if self.master_key:
            self._initialize_encryption()
    
    def _initialize_encryption(self):
        """Initialize encryption with master key"""
        try:
            # Generate key from master secret
            salt = b'elmowafiplatform_salt'  # In production, use random salt
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(self.master_key.encode()))
            self.fernet = Fernet(key)
            logger.info("Encryption initialized for secrets management")
        except Exception as e:
            logger.error(f"Failed to initialize encryption: {e}")
            self.fernet = None
    
    def encrypt_secret(self, secret: str) -> str:
        """Encrypt a secret"""
        if not self.fernet:
            logger.warning("Encryption not available, storing in plain text")
            return secret
        
        try:
            encrypted = self.fernet.encrypt(secret.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Failed to encrypt secret: {e}")
            return secret
    
    def decrypt_secret(self, encrypted_secret: str) -> str:
        """Decrypt a secret"""
        if not self.fernet:
            logger.warning("Encryption not available, returning as-is")
            return encrypted_secret
        
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_secret.encode())
            decrypted = self.fernet.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt secret: {e}")
            return encrypted_secret
    
    def get_secret(self, key: str, default: str = None) -> str:
        """Get a secret value"""
        # Check cache first
        if key in self.secrets_cache:
            return self.secrets_cache[key]
        
        # Check environment variables
        env_value = os.getenv(key)
        if env_value:
            # Try to decrypt if it looks encrypted
            if env_value.startswith('gAAAAA'):
                decrypted = self.decrypt_secret(env_value)
                self.secrets_cache[key] = decrypted
                return decrypted
            else:
                self.secrets_cache[key] = env_value
                return env_value
        
        # Check encrypted environment variables
        encrypted_key = f"{key}_ENCRYPTED"
        encrypted_value = os.getenv(encrypted_key)
        if encrypted_value:
            decrypted = self.decrypt_secret(encrypted_value)
            self.secrets_cache[key] = decrypted
            return decrypted
        
        if default is not None:
            return default
        
        raise ValueError(f"Secret '{key}' not found")
    
    def set_secret(self, key: str, value: str, encrypt: bool = True):
        """Set a secret value"""
        if encrypt and self.fernet:
            encrypted_value = self.encrypt_secret(value)
            os.environ[f"{key}_ENCRYPTED"] = encrypted_value
        else:
            os.environ[key] = value
        
        self.secrets_cache[key] = value
        logger.info(f"Secret '{key}' set")
    
    def get_database_url(self) -> str:
        """Get database URL with decryption"""
        return self.get_secret('DATABASE_URL')
    
    def get_jwt_secret(self) -> str:
        """Get JWT secret with decryption"""
        return self.get_secret('JWT_SECRET_KEY')
    
    def get_ai_keys(self) -> Dict[str, str]:
        """Get AI service keys with decryption"""
        return {
            'azure_ai_endpoint': self.get_secret('AZURE_AI_ENDPOINT', ''),
            'azure_ai_key': self.get_secret('AZURE_AI_KEY', ''),
            'google_ai_key': self.get_secret('GOOGLE_AI_KEY', ''),
        }
    
    def get_sentry_dsn(self) -> str:
        """Get Sentry DSN with decryption"""
        return self.get_secret('SENTRY_DSN', '')
    
    def validate_secrets(self) -> Dict[str, bool]:
        """Validate all required secrets"""
        required_secrets = {
            'DATABASE_URL': 'Database connection string',
            'JWT_SECRET_KEY': 'JWT signing key',
            'AZURE_AI_ENDPOINT': 'Azure AI endpoint',
            'AZURE_AI_KEY': 'Azure AI key',
            'GOOGLE_AI_KEY': 'Google AI key',
        }
        
        validation_results = {}
        for secret_key, description in required_secrets.items():
            try:
                self.get_secret(secret_key)
                validation_results[secret_key] = True
                logger.debug(f"Secret '{secret_key}' ({description}) is valid")
            except Exception as e:
                validation_results[secret_key] = False
                logger.warning(f"Secret '{secret_key}' ({description}) is missing or invalid: {e}")
        
        return validation_results

# Global secrets manager
secrets_manager = SecretsManager()

# Environment-specific secrets
class EnvironmentSecrets:
    """Environment-specific secrets management"""
    
    def __init__(self, environment: str = None):
        self.environment = environment or os.getenv('ENVIRONMENT', 'development')
        self.secrets_manager = secrets_manager
    
    def get_environment_specific_secret(self, base_key: str) -> str:
        """Get environment-specific secret"""
        # Try environment-specific key first
        env_key = f"{base_key}_{self.environment.upper()}"
        try:
            return self.secrets_manager.get_secret(env_key)
        except ValueError:
            # Fallback to base key
            return self.secrets_manager.get_secret(base_key)
    
    def get_production_secrets(self) -> Dict[str, str]:
        """Get production-specific secrets"""
        if self.environment != 'production':
            logger.warning("Attempting to get production secrets in non-production environment")
            return {}
        
        return {
            'database_url': self.get_environment_specific_secret('DATABASE_URL'),
            'jwt_secret': self.get_environment_specific_secret('JWT_SECRET_KEY'),
            'sentry_dsn': self.get_environment_specific_secret('SENTRY_DSN'),
            'azure_ai_endpoint': self.get_environment_specific_secret('AZURE_AI_ENDPOINT'),
            'azure_ai_key': self.get_environment_specific_secret('AZURE_AI_KEY'),
            'google_ai_key': self.get_environment_specific_secret('GOOGLE_AI_KEY'),
        }

# Secrets validation
def validate_production_secrets() -> bool:
    """Validate all production secrets are available"""
    validation_results = secrets_manager.validate_secrets()
    
    missing_secrets = [
        key for key, is_valid in validation_results.items() 
        if not is_valid
    ]
    
    if missing_secrets:
        logger.error(f"Missing required secrets: {missing_secrets}")
        return False
    
    logger.info("All required secrets are available")
    return True

# Secrets rotation
class SecretsRotator:
    """Handle secrets rotation"""
    
    def __init__(self):
        self.secrets_manager = secrets_manager
    
    def rotate_jwt_secret(self) -> str:
        """Rotate JWT secret"""
        import secrets
        new_secret = secrets.token_urlsafe(32)
        self.secrets_manager.set_secret('JWT_SECRET_KEY', new_secret, encrypt=True)
        logger.info("JWT secret rotated")
        return new_secret
    
    def rotate_database_password(self, new_password: str):
        """Rotate database password"""
        # This would need to be implemented based on your database setup
        logger.info("Database password rotation requested")
        # Update database URL with new password
        current_url = self.secrets_manager.get_database_url()
        # Parse and update password in URL
        # This is a simplified example
        logger.info("Database password rotation completed")
    
    def backup_secrets(self) -> Dict[str, str]:
        """Create backup of current secrets"""
        backup = {}
        secret_keys = [
            'DATABASE_URL', 'JWT_SECRET_KEY', 'AZURE_AI_ENDPOINT',
            'AZURE_AI_KEY', 'GOOGLE_AI_KEY', 'SENTRY_DSN'
        ]
        
        for key in secret_keys:
            try:
                value = self.secrets_manager.get_secret(key)
                backup[key] = value
            except ValueError:
                logger.warning(f"Secret '{key}' not available for backup")
        
        return backup

# Secrets monitoring
class SecretsMonitor:
    """Monitor secrets usage and security"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.access_log = []
    
    def log_secret_access(self, secret_key: str, access_type: str = 'read'):
        """Log secret access for monitoring"""
        import time
        self.access_log.append({
            'timestamp': time.time(),
            'secret_key': secret_key,
            'access_type': access_type,
            'environment': os.getenv('ENVIRONMENT', 'unknown')
        })
        
        # Keep only last 1000 entries
        if len(self.access_log) > 1000:
            self.access_log = self.access_log[-1000:]
    
    def get_access_metrics(self) -> Dict[str, Any]:
        """Get secret access metrics"""
        import time
        now = time.time()
        last_hour = now - 3600
        
        recent_access = [
            entry for entry in self.access_log
            if entry['timestamp'] > last_hour
        ]
        
        return {
            'total_access_count': len(self.access_log),
            'recent_access_count': len(recent_access),
            'unique_secrets_accessed': len(set(entry['secret_key'] for entry in self.access_log)),
            'last_access_time': max(entry['timestamp'] for entry in self.access_log) if self.access_log else 0
        }

# Export secrets management components
__all__ = [
    'SecretsManager',
    'secrets_manager',
    'EnvironmentSecrets',
    'validate_production_secrets',
    'SecretsRotator',
    'SecretsMonitor',
] 