#!/usr/bin/env python3
"""
Secure File Upload Validation System for Elmowafiplatform
Enhanced security measures for file uploads with comprehensive validation and content scanning
"""

import os
import hashlib
import magic
import io
import logging
import mimetypes
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
from PIL import Image, ImageFile
import re
import zipfile
import struct
from datetime import datetime

from logging_config import get_logger
from error_responses import ErrorCodes, ValidationException, ErrorDetail

logger = get_logger("secure_file_validation")

class SecureFileValidator:
    """Enhanced file validation with security scanning"""
    
    def __init__(self):
        # File size limits (bytes)
        self.max_file_sizes = {
            'image': 50 * 1024 * 1024,  # 50MB for images
            'document': 25 * 1024 * 1024,  # 25MB for documents
            'video': 500 * 1024 * 1024,  # 500MB for videos
            'audio': 100 * 1024 * 1024,  # 100MB for audio
        }
        
        # Allowed MIME types and extensions
        self.allowed_types = {
            'image': {
                'extensions': {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'},
                'mime_types': {
                    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
                    'image/bmp', 'image/webp', 'image/tiff', 'image/svg+xml'
                },
                'magic_bytes': [
                    b'\xff\xd8\xff',  # JPEG
                    b'\x89PNG\r\n\x1a\n',  # PNG
                    b'GIF87a', b'GIF89a',  # GIF
                    b'BM',  # BMP
                    b'RIFF',  # WebP (contains WEBP)
                ]
            },
            'document': {
                'extensions': {'.pdf', '.doc', '.docx', '.txt', '.rtf'},
                'mime_types': {
                    'application/pdf', 'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain', 'text/rtf'
                },
                'magic_bytes': [
                    b'%PDF',  # PDF
                    b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1',  # MS Office
                ]
            }
        }
        
        # Dangerous file signatures to block
        self.malicious_signatures = {
            # Executable files
            b'MZ': 'Windows executable',
            b'\x7fELF': 'Linux executable', 
            b'\xfe\xed\xfa': 'macOS executable',
            
            # Script files
            b'#!/bin/sh': 'Shell script',
            b'#!/bin/bash': 'Bash script',
            b'<?php': 'PHP script',
            b'<script': 'JavaScript/HTML',
            
            # Archive bombs
            b'PK\x03\x04': 'ZIP archive (needs deep scan)',
            b'Rar!': 'RAR archive',
            
            # Other suspicious patterns
            b'javascript:': 'JavaScript URL',
            b'vbscript:': 'VBScript URL',
        }
        
        # Suspicious file patterns
        self.suspicious_patterns = [
            # Polyglot files (files that are valid in multiple formats)
            re.compile(br'<\?php.*?\?>', re.IGNORECASE | re.DOTALL),
            re.compile(br'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
            re.compile(br'javascript:', re.IGNORECASE),
            re.compile(br'vbscript:', re.IGNORECASE),
            re.compile(br'data:.*base64', re.IGNORECASE),
            
            # Embedded executables
            re.compile(br'This program cannot be run in DOS mode', re.IGNORECASE),
            re.compile(br'KERNEL32\.DLL', re.IGNORECASE),
        ]
        
        self.quarantine_dir = os.getenv('QUARANTINE_DIR', 'quarantine/')
        Path(self.quarantine_dir).mkdir(parents=True, exist_ok=True)
    
    async def validate_file(
        self, 
        file_data: bytes, 
        filename: str, 
        expected_type: str = 'image',
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive file validation with security scanning
        
        Args:
            file_data: Raw file bytes
            filename: Original filename
            expected_type: Expected file type (image, document, video, audio)
            user_id: User performing upload for audit logging
            
        Returns:
            Dict with validation results and security assessment
        """
        
        validation_start = datetime.now()
        file_hash = hashlib.sha256(file_data).hexdigest()
        
        logger.info(f"Starting secure validation for {filename} (hash: {file_hash[:16]}...)")
        
        try:
            # Step 1: Basic file validation
            basic_validation = await self._basic_file_validation(file_data, filename, expected_type)
            if not basic_validation['valid']:
                return basic_validation
            
            # Step 2: Magic byte validation
            magic_validation = await self._magic_byte_validation(file_data, expected_type)
            if not magic_validation['valid']:
                return magic_validation
            
            # Step 3: MIME type validation  
            mime_validation = await self._mime_type_validation(file_data, filename, expected_type)
            if not mime_validation['valid']:
                return mime_validation
            
            # Step 4: Malicious content scanning
            malware_scan = await self._malware_scan(file_data, filename)
            if not malware_scan['valid']:
                await self._quarantine_file(file_data, filename, file_hash, malware_scan['threat_type'])
                return malware_scan
            
            # Step 5: Content validation (for images)
            if expected_type == 'image':
                image_validation = await self._image_content_validation(file_data)
                if not image_validation['valid']:
                    return image_validation
            
            # Step 6: Archive scanning (if applicable)
            if self._is_archive(file_data):
                archive_scan = await self._archive_scan(file_data, filename)
                if not archive_scan['valid']:
                    return archive_scan
            
            # Step 7: Final security assessment
            security_score = self._calculate_security_score(file_data, filename, expected_type)
            
            validation_duration = (datetime.now() - validation_start).total_seconds()
            
            # Log successful validation
            logger.info(f"File validation completed: {filename} (score: {security_score}, duration: {validation_duration:.2f}s)")
            
            return {
                'valid': True,
                'file_hash': file_hash,
                'security_score': security_score,
                'file_size': len(file_data),
                'validation_duration': validation_duration,
                'content_type': basic_validation.get('detected_type'),
                'safe_filename': self._sanitize_filename(filename),
                'metadata': {
                    'validated_at': datetime.now().isoformat(),
                    'validator_version': '1.0.0',
                    'user_id': user_id
                }
            }
            
        except Exception as e:
            logger.error(f"File validation error for {filename}: {e}")
            # Don't expose internal errors to clients
            return {
                'valid': False,
                'error': 'File validation failed due to internal error',
                'error_code': ErrorCodes.FILE_CORRUPTED
            }
    
    async def _basic_file_validation(self, file_data: bytes, filename: str, expected_type: str) -> Dict[str, Any]:
        """Basic file size and extension validation"""
        
        # Check file size
        file_size = len(file_data)
        max_size = self.max_file_sizes.get(expected_type, self.max_file_sizes['image'])
        
        if file_size == 0:
            return {
                'valid': False,
                'error': 'Empty file uploaded',
                'error_code': ErrorCodes.FILE_CORRUPTED
            }
        
        if file_size > max_size:
            return {
                'valid': False,
                'error': f'File too large. Maximum size for {expected_type}: {max_size // (1024*1024)}MB',
                'error_code': ErrorCodes.FILE_TOO_LARGE
            }
        
        # Check filename for suspicious patterns
        if self._has_suspicious_filename(filename):
            return {
                'valid': False,
                'error': 'Filename contains suspicious patterns',
                'error_code': ErrorCodes.FILE_TYPE_NOT_ALLOWED
            }
        
        # Check file extension
        file_extension = Path(filename).suffix.lower()
        allowed_extensions = self.allowed_types[expected_type]['extensions']
        
        if file_extension not in allowed_extensions:
            return {
                'valid': False,
                'error': f'File type not allowed. Allowed extensions: {", ".join(sorted(allowed_extensions))}',
                'error_code': ErrorCodes.FILE_TYPE_NOT_ALLOWED
            }
        
        return {'valid': True, 'detected_type': expected_type}
    
    async def _magic_byte_validation(self, file_data: bytes, expected_type: str) -> Dict[str, Any]:
        """Validate file using magic bytes (file signature)"""
        
        if len(file_data) < 16:
            return {
                'valid': False, 
                'error': 'File too small for magic byte validation',
                'error_code': ErrorCodes.FILE_CORRUPTED
            }
        
        file_header = file_data[:16]
        expected_signatures = self.allowed_types[expected_type]['magic_bytes']
        
        # Check if file matches expected type signatures
        signature_match = False
        for signature in expected_signatures:
            if file_data.startswith(signature):
                signature_match = True
                break
        
        if not signature_match:
            return {
                'valid': False,
                'error': f'File signature does not match expected {expected_type} format',
                'error_code': ErrorCodes.FILE_TYPE_NOT_ALLOWED
            }
        
        return {'valid': True}
    
    async def _mime_type_validation(self, file_data: bytes, filename: str, expected_type: str) -> Dict[str, Any]:
        """Validate MIME type using python-magic"""
        
        try:
            # Use python-magic for MIME type detection
            detected_mime = magic.from_buffer(file_data, mime=True)
            allowed_mimes = self.allowed_types[expected_type]['mime_types']
            
            if detected_mime not in allowed_mimes:
                return {
                    'valid': False,
                    'error': f'MIME type {detected_mime} not allowed for {expected_type}',
                    'error_code': ErrorCodes.FILE_TYPE_NOT_ALLOWED
                }
            
            # Cross-check with filename extension
            guessed_mime, _ = mimetypes.guess_type(filename)
            if guessed_mime and guessed_mime != detected_mime:
                logger.warning(f"MIME type mismatch: filename suggests {guessed_mime}, content is {detected_mime}")
                # Allow this but log for monitoring
            
            return {'valid': True, 'detected_mime': detected_mime}
            
        except Exception as e:
            logger.warning(f"MIME type detection failed: {e}")
            # Fallback to basic validation
            return {'valid': True}
    
    async def _malware_scan(self, file_data: bytes, filename: str) -> Dict[str, Any]:
        """Scan for malicious content patterns"""
        
        # Check for malicious file signatures
        for signature, threat_type in self.malicious_signatures.items():
            if file_data.startswith(signature):
                logger.critical(f"SECURITY ALERT: Malicious signature detected in {filename}: {threat_type}")
                return {
                    'valid': False,
                    'error': 'File contains malicious content',
                    'error_code': ErrorCodes.FILE_CORRUPTED,
                    'threat_type': threat_type
                }
        
        # Check for suspicious content patterns
        for pattern in self.suspicious_patterns:
            if pattern.search(file_data):
                logger.warning(f"SECURITY WARNING: Suspicious pattern detected in {filename}")
                return {
                    'valid': False,
                    'error': 'File contains suspicious content patterns',
                    'error_code': ErrorCodes.FILE_CORRUPTED,
                    'threat_type': 'suspicious_pattern'
                }
        
        # Check for embedded executables in images (polyglot attacks)
        if self._check_polyglot_attack(file_data):
            logger.critical(f"SECURITY ALERT: Polyglot attack detected in {filename}")
            return {
                'valid': False,
                'error': 'File contains embedded executable content',
                'error_code': ErrorCodes.FILE_CORRUPTED,
                'threat_type': 'polyglot_attack'
            }
        
        return {'valid': True}
    
    async def _image_content_validation(self, file_data: bytes) -> Dict[str, Any]:
        """Deep validation for image files"""
        
        try:
            # Open and validate image structure
            with Image.open(io.BytesIO(file_data)) as img:
                # Check image dimensions
                width, height = img.size
                if width > 20000 or height > 20000:
                    return {
                        'valid': False,
                        'error': 'Image dimensions too large (potential zip bomb)',
                        'error_code': ErrorCodes.FILE_TOO_LARGE
                    }
                
                # Check for excessive metadata (potential data hiding)
                if hasattr(img, '_getexif'):
                    exif = img._getexif()
                    if exif and len(str(exif)) > 50000:  # 50KB of EXIF data is suspicious
                        logger.warning(f"Image has excessive EXIF data ({len(str(exif))} bytes)")
                
                # Verify image can be processed (not corrupted)
                img.verify()
                
                # Re-open for pixel validation (verify() closes the image)
                img = Image.open(io.BytesIO(file_data))
                
                # Check for malicious pixel patterns (steganography detection)
                if self._check_steganography_indicators(img):
                    logger.warning("Potential steganography detected in image")
                
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': f'Invalid or corrupted image: {str(e)}',
                'error_code': ErrorCodes.FILE_CORRUPTED
            }
    
    async def _archive_scan(self, file_data: bytes, filename: str) -> Dict[str, Any]:
        """Scan archives for zip bombs and malicious content"""
        
        try:
            if filename.lower().endswith('.zip') or file_data.startswith(b'PK'):
                with zipfile.ZipFile(io.BytesIO(file_data), 'r') as zip_file:
                    # Check for zip bomb indicators
                    total_size = sum(info.file_size for info in zip_file.filelist)
                    compressed_size = sum(info.compress_size for info in zip_file.filelist)
                    
                    # Compression ratio check (potential zip bomb)
                    if compressed_size > 0 and total_size / compressed_size > 1000:
                        return {
                            'valid': False,
                            'error': 'Archive has suspicious compression ratio (potential zip bomb)',
                            'error_code': ErrorCodes.FILE_CORRUPTED
                        }
                    
                    # Check number of files (potential zip bomb)
                    if len(zip_file.filelist) > 10000:
                        return {
                            'valid': False,
                            'error': 'Archive contains too many files',
                            'error_code': ErrorCodes.FILE_TOO_LARGE
                        }
                    
                    # Check for malicious filenames
                    for info in zip_file.filelist:
                        if '../' in info.filename or '\\' in info.filename:
                            return {
                                'valid': False,
                                'error': 'Archive contains path traversal attack',
                                'error_code': ErrorCodes.FILE_CORRUPTED
                            }
            
            return {'valid': True}
            
        except Exception as e:
            return {
                'valid': False,
                'error': f'Archive validation failed: {str(e)}',
                'error_code': ErrorCodes.FILE_CORRUPTED
            }
    
    def _is_archive(self, file_data: bytes) -> bool:
        """Check if file is an archive format"""
        archive_signatures = [
            b'PK\x03\x04',  # ZIP
            b'Rar!',        # RAR
            b'\x1f\x8b',    # GZIP
            b'BZh',         # BZIP2
            b'7z\xbc\xaf\x27\x1c',  # 7ZIP
        ]
        
        for signature in archive_signatures:
            if file_data.startswith(signature):
                return True
        return False
    
    def _has_suspicious_filename(self, filename: str) -> bool:
        """Check filename for suspicious patterns"""
        suspicious_patterns = [
            r'\.\./',           # Path traversal
            r'[<>:"|?*]',       # Invalid filename characters
            r'\.exe$',          # Executable extensions
            r'\.bat$',
            r'\.cmd$',
            r'\.scr$',
            r'\.pif$',
            r'\.com$',
            r'\.vbs$',
            r'\.js$',
            r'\.jar$',
            r'\.php$',
            r'^\.',             # Hidden files
            r'__MACOSX',        # Mac resource fork
            r'Thumbs\.db',      # Windows thumbnail cache
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, filename, re.IGNORECASE):
                return True
        
        return False
    
    def _check_polyglot_attack(self, file_data: bytes) -> bool:
        """Check for polyglot files (valid in multiple formats)"""
        
        # Look for executable signatures within image data
        if len(file_data) > 1024:  # Skip first 1KB which might be image header
            search_data = file_data[1024:]
            
            malicious_sigs = [b'MZ', b'\x7fELF', b'<?php', b'<script']
            for sig in malicious_sigs:
                if sig in search_data:
                    return True
        
        return False
    
    def _check_steganography_indicators(self, img: Image.Image) -> bool:
        """Basic steganography detection"""
        
        try:
            # Check for unusual pixel patterns that might indicate hidden data
            if img.mode == 'RGB':
                # Get pixel data
                pixels = list(img.getdata())
                
                # Check for patterns in least significant bits
                lsb_values = []
                for pixel in pixels[:1000]:  # Check first 1000 pixels
                    for channel in pixel:
                        lsb_values.append(channel & 1)
                
                # Look for non-random patterns in LSBs
                if len(set(lsb_values)) < 2:  # All same LSB value is suspicious
                    return True
                
                # Check for excessive entropy in LSBs
                ones_count = sum(lsb_values)
                if ones_count < len(lsb_values) * 0.3 or ones_count > len(lsb_values) * 0.7:
                    return True
            
            return False
            
        except Exception:
            return False
    
    def _calculate_security_score(self, file_data: bytes, filename: str, expected_type: str) -> float:
        """Calculate security score (0-100, higher is safer)"""
        
        score = 100.0
        
        # File size penalties
        file_size = len(file_data)
        max_size = self.max_file_sizes[expected_type]
        
        if file_size > max_size * 0.8:
            score -= 10  # Large files are riskier
        
        # Filename penalties
        if len(filename) > 100:
            score -= 5
        
        if '.' in filename[:-4]:  # Multiple extensions
            score -= 15
        
        # Content analysis
        if b'\x00' in file_data[:1024]:  # Null bytes in header
            score -= 10
        
        # High entropy might indicate compressed/encrypted data
        entropy = self._calculate_entropy(file_data[:4096])
        if entropy > 7.5:  # Very high entropy
            score -= 15
        elif entropy < 3.0:  # Very low entropy  
            score -= 10
        
        return max(0.0, min(100.0, score))
    
    def _calculate_entropy(self, data: bytes) -> float:
        """Calculate Shannon entropy of data"""
        if not data:
            return 0
        
        # Count byte frequencies
        frequencies = {}
        for byte in data:
            frequencies[byte] = frequencies.get(byte, 0) + 1
        
        # Calculate entropy
        entropy = 0
        length = len(data)
        
        for count in frequencies.values():
            probability = count / length
            entropy -= probability * (probability.bit_length() - 1 if probability > 0 else 0)
        
        return entropy
    
    def _sanitize_filename(self, filename: str) -> str:
        """Create safe filename for storage"""
        
        # Remove path components
        filename = os.path.basename(filename)
        
        # Remove dangerous characters
        safe_chars = re.sub(r'[^\w\-_\.]', '_', filename)
        
        # Limit length
        if len(safe_chars) > 100:
            name, ext = os.path.splitext(safe_chars)
            safe_chars = name[:95] + ext
        
        # Ensure it doesn't start with dot
        if safe_chars.startswith('.'):
            safe_chars = 'file' + safe_chars
        
        return safe_chars
    
    async def _quarantine_file(self, file_data: bytes, filename: str, file_hash: str, threat_type: str):
        """Move malicious file to quarantine"""
        
        try:
            quarantine_path = Path(self.quarantine_dir) / f"{file_hash}_{threat_type}_{datetime.now().isoformat().replace(':', '-')}"
            
            with open(quarantine_path, 'wb') as f:
                f.write(file_data)
            
            # Log security incident
            logger.critical(f"SECURITY INCIDENT: File quarantined - {filename} -> {quarantine_path} (threat: {threat_type})")
            
            # TODO: Send security alert notification
            
        except Exception as e:
            logger.error(f"Failed to quarantine malicious file {filename}: {e}")

# Singleton instance
_secure_validator = None

def get_secure_file_validator() -> SecureFileValidator:
    """Get singleton instance of secure file validator"""
    global _secure_validator
    if _secure_validator is None:
        _secure_validator = SecureFileValidator()
    return _secure_validator