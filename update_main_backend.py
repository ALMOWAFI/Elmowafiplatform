#!/usr/bin/env python3
"""
Update Main Backend Script

This script updates the main backend's main.py file to include the MongoDB integration
from the elmowafy-travels-oasis server component.
"""

import os
import sys
import shutil
from datetime import datetime

# Define paths
MAIN_BACKEND_PATH = os.path.join(os.getcwd(), 'backend', 'main.py')
BACKUP_PATH = os.path.join(os.getcwd(), 'backend', f'main.py.bak.{datetime.now().strftime("%Y%m%d%H%M%S")}')

# MongoDB integration code to add
MONGODB_INTEGRATION_IMPORT = """
# Import MongoDB integration from elmowafy-travels-oasis
try:
    sys.path.append(os.path.join(os.getcwd(), 'elmowafy-travels-oasis', 'backend'))
    from mongodb_integration import router as mongodb_router
    MONGODB_INTEGRATION_AVAILABLE = True
    logger.info("MongoDB integration loaded successfully")
except ImportError as e:
    logger.warning(f"MongoDB integration not available: {e}")
    mongodb_router = None
    MONGODB_INTEGRATION_AVAILABLE = False
"""

MONGODB_INTEGRATION_ROUTER = """
# Include MongoDB integration router if available
if MONGODB_INTEGRATION_AVAILABLE:
    app.include_router(mongodb_router)
    logger.info("MongoDB integration router included")
"""

def backup_main_file():
    """Create a backup of the main.py file."""
    if os.path.exists(MAIN_BACKEND_PATH):
        shutil.copy2(MAIN_BACKEND_PATH, BACKUP_PATH)
        print(f"Backup created at {BACKUP_PATH}")
    else:
        print(f"Main backend file not found at {MAIN_BACKEND_PATH}")
        sys.exit(1)

def update_main_file():
    """Update the main.py file to include MongoDB integration."""
    with open(MAIN_BACKEND_PATH, 'r') as f:
        content = f.read()
    
    # Find the appropriate locations to insert the code
    import_section_end = content.find("# Initialize logging early")
    if import_section_end == -1:
        import_section_end = content.find("# Initialize logging")
    
    if import_section_end == -1:
        print("Could not find appropriate location for import section")
        return False
    
    router_section = content.find("# Include routers")
    if router_section == -1:
        print("Could not find router section")
        return False
    
    # Insert the MongoDB integration import
    updated_content = (
        content[:import_section_end] + 
        MONGODB_INTEGRATION_IMPORT + 
        content[import_section_end:]
    )
    
    # Find the end of the router includes section
    router_section_end = updated_content.find("\n\n", router_section)
    if router_section_end == -1:
        router_section_end = updated_content.find("# Health check")
    
    if router_section_end == -1:
        print("Could not find end of router section")
        return False
    
    # Insert the MongoDB integration router
    final_content = (
        updated_content[:router_section_end] + 
        MONGODB_INTEGRATION_ROUTER + 
        updated_content[router_section_end:]
    )
    
    # Write the updated content back to the file
    with open(MAIN_BACKEND_PATH, 'w') as f:
        f.write(final_content)
    
    return True

def main():
    """Main function."""
    print("Updating main backend to include MongoDB integration...")
    
    # Create backup
    backup_main_file()
    
    # Update main file
    if update_main_file():
        print("Main backend updated successfully!")
    else:
        print("Failed to update main backend. Please check the backup file.")

if __name__ == "__main__":
    main()