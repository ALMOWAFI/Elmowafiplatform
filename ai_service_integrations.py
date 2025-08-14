#!/usr/bin/env python3
"""
AI Service Integrations for Elmowafiplatform
Integrates multiple AI service providers including OpenAI, Gemini and Minimax
"""

import os
import sys
import json
import logging
from typing import Dict, Any, Optional, List
from functools import lru_cache

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import Gemini API
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    logger.warning("Google Generative AI (Gemini) package not found. Install with: pip install google-generativeai")
    GEMINI_AVAILABLE = False

# Import requests for API calls
import requests

# Import OpenAI API
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    logger.warning("OpenAI package not found. Install with: pip install openai")
    OPENAI_AVAILABLE = False

class AIServiceManager:
    """Manager for multiple AI service providers"""
    
    def __init__(self):
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        self.gemini_api_key = os.environ.get('GEMINI_API_KEY')
        self.minimax_api_key = os.environ.get('MINIMAX_API_KEY')
        self.gemini_model = None
        self.openai_client = None
        self.services_status = {
            'openai': False,
            'gemini': False,
            'minimax': False
        }
        
        # Initialize available services
        self.initialize_services()
    
    def initialize_services(self):
        """Initialize all available AI services"""
        # Initialize OpenAI if available
        if OPENAI_AVAILABLE and self.openai_api_key:
            try:
                self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
                # Simple validation by checking if the key has the correct format
                if self.openai_api_key.startswith("sk-"):
                    self.services_status['openai'] = True
                    logger.info("OpenAI service initialized successfully")
                else:
                    logger.warning("OpenAI API key format appears invalid")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI: {e}")
        
        # Initialize Gemini if available
        if GEMINI_AVAILABLE and self.gemini_api_key:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')
                self.services_status['gemini'] = True
                logger.info("Gemini AI service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini AI: {e}")
        
        # Validate Minimax API key
        if self.minimax_api_key:
            try:
                # Simple validation of the token format
                if self.minimax_api_key.startswith("eyJ"):
                    self.services_status['minimax'] = True
                    logger.info("Minimax API key validated successfully")
                else:
                    logger.warning("Minimax API key format appears invalid")
            except Exception as e:
                logger.error(f"Error validating Minimax API key: {e}")
    
    def set_api_keys(self, openai_key: Optional[str] = None, gemini_key: Optional[str] = None, minimax_key: Optional[str] = None):
        """Set API keys for services"""
        if openai_key:
            self.openai_api_key = openai_key
            os.environ['OPENAI_API_KEY'] = openai_key
            
            # Re-initialize OpenAI with new key
            if OPENAI_AVAILABLE:
                try:
                    self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
                    self.services_status['openai'] = True
                    logger.info("OpenAI service re-initialized with new API key")
                except Exception as e:
                    logger.error(f"Failed to initialize OpenAI with new key: {e}")
        
        if gemini_key:
            self.gemini_api_key = gemini_key
            os.environ['GEMINI_API_KEY'] = gemini_key
            
            # Re-initialize Gemini with new key
            if GEMINI_AVAILABLE:
                try:
                    genai.configure(api_key=self.gemini_api_key)
                    self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')
                    self.services_status['gemini'] = True
                    logger.info("Gemini AI service re-initialized with new API key")
                except Exception as e:
                    logger.error(f"Failed to initialize Gemini AI with new key: {e}")
        
        if minimax_key:
            self.minimax_api_key = minimax_key
            os.environ['MINIMAX_API_KEY'] = minimax_key
            self.services_status['minimax'] = True
            logger.info("Minimax API key updated")
    
    def get_service_status(self) -> Dict[str, bool]:
        """Get status of all AI services"""
        return self.services_status
    
    async def generate_gemini_content(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content using Gemini AI"""
        if not self.services_status['gemini'] or not self.gemini_model:
            return {"error": "Gemini AI service not available"}
        
        try:
            response = self.gemini_model.generate_content(prompt, **kwargs)
            return {
                "text": response.text,
                "provider": "gemini",
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Error generating content with Gemini: {e}")
            return {"error": str(e), "provider": "gemini", "status": "error"}
    
    async def generate_minimax_content(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content using Minimax API"""
        if not self.services_status['minimax']:
            return {"error": "Minimax API service not available"}
        
        try:
            # Minimax API endpoint
            url = "https://api.minimax.chat/v1/text/generation"
            
            # Prepare headers with authentication
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.minimax_api_key}"
            }
            
            # Prepare request payload
            payload = {
                "model": kwargs.get("model", "abab5.5-chat"),
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 0.9),
                "max_tokens": kwargs.get("max_tokens", 1024)
            }
            
            # Make API request
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            
            # Extract response text
            if "reply" in result:
                return {
                    "text": result["reply"],
                    "provider": "minimax",
                    "status": "success",
                    "full_response": result
                }
            else:
                return {"error": "Unexpected response format", "provider": "minimax", "status": "error"}
                
        except Exception as e:
            logger.error(f"Error generating content with Minimax: {e}")
            return {"error": str(e), "provider": "minimax", "status": "error"}
    
    async def generate_openai_content(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content using OpenAI"""
        if not self.services_status['openai'] or not self.openai_client:
            return {"error": "OpenAI service not available"}
        
        try:
            # Prepare the messages for chat completion
            messages = kwargs.get("messages", [{"role": "user", "content": prompt}])
            
            # If only prompt is provided, convert it to messages format
            if not kwargs.get("messages"):
                messages = [{"role": "user", "content": prompt}]
            
            # Set default parameters
            model = kwargs.get("model", "gpt-3.5-turbo")
            temperature = kwargs.get("temperature", 0.7)
            max_tokens = kwargs.get("max_tokens", 1000)
            
            # Call OpenAI API
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract the response text
            if response.choices and len(response.choices) > 0:
                return {
                    "text": response.choices[0].message.content,
                    "provider": "openai",
                    "status": "success",
                    "full_response": response
                }
            else:
                return {"error": "No response generated", "provider": "openai", "status": "error"}
                
        except Exception as e:
            logger.error(f"Error generating content with OpenAI: {e}")
            return {"error": str(e), "provider": "openai", "status": "error"}
    
    async def generate_content(self, prompt: str, provider: str = "auto", **kwargs) -> Dict[str, Any]:
        """Generate content using the specified or best available provider"""
        if provider == "openai" and self.services_status['openai']:
            return await self.generate_openai_content(prompt, **kwargs)
        elif provider == "gemini" and self.services_status['gemini']:
            return await self.generate_gemini_content(prompt, **kwargs)
        elif provider == "minimax" and self.services_status['minimax']:
            return await self.generate_minimax_content(prompt, **kwargs)
        elif provider == "auto":
            # Try OpenAI first, then Gemini, then fall back to Minimax
            if self.services_status['openai']:
                return await self.generate_openai_content(prompt, **kwargs)
            elif self.services_status['gemini']:
                return await self.generate_gemini_content(prompt, **kwargs)
            elif self.services_status['minimax']:
                return await self.generate_minimax_content(prompt, **kwargs)
            else:
                return {"error": "No AI services available", "status": "error"}
        else:
            return {"error": f"Unknown provider: {provider}", "status": "error"}

# Global instance
ai_service_manager = None

def initialize_ai_service_manager():
    """Initialize the AI service manager"""
    global ai_service_manager
    ai_service_manager = AIServiceManager()
    return ai_service_manager

def get_ai_service_manager():
    """Get the AI service manager instance"""
    global ai_service_manager
    if ai_service_manager is None:
        ai_service_manager = initialize_ai_service_manager()
    return ai_service_manager

# Initialize if this module is run directly
if __name__ == "__main__":
    # Load API keys from environment or .env file
    from dotenv import load_dotenv
    load_dotenv()
    
    # Initialize service manager
    manager = initialize_ai_service_manager()
    
    # Print service status
    print("AI Service Status:")
    for service, status in manager.get_service_status().items():
        print(f"  {service}: {'Available' if status else 'Not Available'}")