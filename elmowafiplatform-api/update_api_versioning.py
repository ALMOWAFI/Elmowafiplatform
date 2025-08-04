#!/usr/bin/env python3
"""
Script to update all API endpoints to use versioning
Updates /api/ endpoints to /api/v1/ in main.py
"""

import re
import sys

def update_api_versioning():
    """Update main.py to use API versioning"""
    
    # Read the main.py file
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Keep track of changes
    changes = []
    
    # Pattern to match @app.(get|post|put|delete)("/api/...
    pattern = r'@app\.(get|post|put|delete|patch)\("(/api/[^"]+)"\)'
    
    def replace_endpoint(match):
        method = match.group(1)
        path = match.group(2)
        
        # Skip health endpoints (keep them unversioned for monitoring)
        if any(health_path in path for health_path in ['/health', '/metrics']):
            return match.group(0)  # Return unchanged
        
        # Add v1 to the path
        new_path = path.replace('/api/', '/api/v1/')
        changes.append(f"  {path} → {new_path}")
        
        return f'@app.{method}("{new_path}")'
    
    # Apply the replacements
    updated_content = re.sub(pattern, replace_endpoint, content)
    
    # Also update any string patterns that use f"{API_V1_PREFIX}/... to just use the full path
    # This is for consistency
    
    # Write the updated content back
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print("API Versioning Update Complete!")
    print(f"Updated {len(changes)} endpoints:")
    for change in changes:
        print(change)
    
    return len(changes)

if __name__ == "__main__":
    try:
        changes_count = update_api_versioning()
        print(f"\nSuccessfully updated {changes_count} API endpoints to use v1 versioning")
        print("All endpoints now use /api/v1/ prefix (except health/metrics)")
    except Exception as e:
        print(f"Error updating API versioning: {e}")
        sys.exit(1)