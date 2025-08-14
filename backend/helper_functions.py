#!/usr/bin/env python3
"""
Helper functions for the Elmowafiplatform backend
"""

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
import aiofiles
from fastapi import UploadFile

logger = logging.getLogger(__name__)

async def save_uploaded_file(file: UploadFile, directory: Path) -> str:
    """Save uploaded file to specified directory"""
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    file_path = directory / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return filename

async def analyze_image_with_ai(image_path: str, analysis_type: str = "general", family_context: List[Dict] = None) -> Dict[str, Any]:
    """Analyze image using AI services"""
    try:
        # Import AI services locally to avoid circular imports
        from backend.ai_services import family_ai_analyzer
        
        if not family_ai_analyzer:
            return {
                "success": False,
                "error": "AI services not available",
                "analysis": {}
            }
        
        # Use the family AI analyzer
        analysis_result = await family_ai_analyzer.analyze_family_photo(image_path, family_context or [])
        
        return {
            "success": True,
            "analysis": analysis_result,
            "ai_powered": True
        }
        
    except Exception as e:
        logger.error(f"AI image analysis error: {e}")
        return {
            "success": False,
            "error": str(e),
            "analysis": {}
        }