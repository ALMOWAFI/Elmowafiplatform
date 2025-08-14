#!/usr/bin/env python3
"""
Run API Enhancements for Elmowafiplatform

This script runs the API enhancements implemented for the Elmowafiplatform.
It starts a FastAPI application with GraphQL, API versioning, and service mesh integration.
"""

import os
import logging
import socket
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Function to find an available port
def find_available_port(start_port=8000, max_port=9000):
    """Find an available port in the given range"""
    for port in range(start_port, max_port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"Could not find an available port in range {start_port}-{max_port}")

# Try to import required libraries
try:
    import uvicorn
    UVICORN_AVAILABLE = True
except ImportError:
    UVICORN_AVAILABLE = False
    logger.error("uvicorn not available, cannot run server")

try:
    from fastapi import FastAPI
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    logger.error("fastapi not available, cannot run server")

# Import API integration
try:
    from api_integration import create_app, integrate_with_main
    API_INTEGRATION_AVAILABLE = True
except ImportError:
    API_INTEGRATION_AVAILABLE = False
    logger.error("api_integration not available, cannot run server")

# Import asyncio for event loop management
import asyncio

# Main function
async def main():
    """Main function"""
    # Check if required libraries are available
    if not all([UVICORN_AVAILABLE, FASTAPI_AVAILABLE, API_INTEGRATION_AVAILABLE]):
        logger.error("Required libraries not available, cannot run server")
        return 1
    
    # Create FastAPI app
    logger.info("Creating FastAPI app with API enhancements")
    app = create_app()
    
    # Run server
    logger.info("Starting server on http://localhost:8000")
    logger.info("API documentation available at http://localhost:8000/api/v1/docs")
    logger.info("GraphQL endpoint available at http://localhost:8000/api/v1/graphql")
    logger.info("Service mesh API available at http://localhost:8000/api/v1/mesh")
    logger.info("Press Ctrl+C to stop the server")
    
    # Find an available port
    port = find_available_port()
    logger.info(f"Using port {port}")
    
    # Configure uvicorn to use the asyncio event loop
    config = uvicorn.Config(app, host="0.0.0.0", port=port, loop="asyncio")
    server = uvicorn.Server(config)
    await server.serve()
    
    return 0

# Alternative function to integrate with existing app
def integrate_with_existing_app():
    """Integrate API enhancements with existing app"""
    # Check if required libraries are available
    if not all([FASTAPI_AVAILABLE, API_INTEGRATION_AVAILABLE]):
        logger.error("Required libraries not available, cannot integrate")
        return None
    
    # Create existing FastAPI app
    app = FastAPI(title="Elmowafiplatform")
    
    # Add existing routes and middleware
    # ...
    
    # Integrate API enhancements
    logger.info("Integrating API enhancements with existing app")
    app = integrate_with_main(app)
    
    return app

# Run main function
if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        exit(exit_code)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        exit(0)
    except Exception as e:
        logger.error(f"Error running server: {str(e)}")
        exit(1)