#!/usr/bin/env python3
"""
Check Dependencies for API Enhancements

This script checks if the required dependencies for the API enhancements are installed.
It also provides instructions on how to install missing dependencies.
"""

import importlib.util
import sys
import subprocess
import logging
from typing import Dict, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define required dependencies
REQUIRED_DEPENDENCIES = [
    ("fastapi", "FastAPI", "fastapi"),
    ("strawberry", "Strawberry GraphQL", "strawberry-graphql"),
    ("httpx", "HTTPX", "httpx"),
    ("uvicorn", "Uvicorn", "uvicorn"),
    ("pydantic", "Pydantic", "pydantic"),
    ("asyncpg", "AsyncPG", "asyncpg"),
    ("aiosqlite", "AioSQLite", "aiosqlite"),
    ("pytest", "Pytest", "pytest"),
    ("pytest_asyncio", "Pytest AsyncIO", "pytest-asyncio"),
]

# Check if a package is installed
def is_package_installed(package_name: str) -> bool:
    """Check if a package is installed"""
    return importlib.util.find_spec(package_name) is not None

# Check all dependencies
def check_dependencies() -> Tuple[List[str], List[str]]:
    """Check all dependencies and return lists of installed and missing packages"""
    installed_packages = []
    missing_packages = []
    
    for package_name, display_name, pip_name in REQUIRED_DEPENDENCIES:
        if is_package_installed(package_name):
            installed_packages.append((display_name, pip_name))
        else:
            missing_packages.append((display_name, pip_name))
    
    return installed_packages, missing_packages

# Generate installation command
def generate_installation_command(missing_packages: List[Tuple[str, str]]) -> str:
    """Generate pip installation command for missing packages"""
    if not missing_packages:
        return ""
    
    pip_names = [pip_name for _, pip_name in missing_packages]
    return f"pip install {' '.join(pip_names)}"

# Main function
def main():
    """Main function"""
    logger.info("Checking dependencies for API enhancements")
    
    # Check dependencies
    installed_packages, missing_packages = check_dependencies()
    
    # Print installed packages
    if installed_packages:
        logger.info("Installed packages:")
        for display_name, _ in installed_packages:
            logger.info(f"  ✓ {display_name}")
    
    # Print missing packages
    if missing_packages:
        logger.warning("Missing packages:")
        for display_name, _ in missing_packages:
            logger.warning(f"  ✗ {display_name}")
        
        # Generate installation command
        installation_command = generate_installation_command(missing_packages)
        logger.info("\nTo install missing packages, run:")
        logger.info(f"  {installation_command}")
        
        return 1
    else:
        logger.info("\nAll required dependencies are installed!")
        return 0

# Run main function
if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)