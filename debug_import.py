#!/usr/bin/env python3
"""Debug script to trace Family AI import issues"""

import traceback
import sys

print("=== Debugging Family AI Import Issues ===")

# Test 1: Family AI Models
print("\n1. Testing Family AI Models import...")
try:
    from backend.family_ai_models import Base, FamilyPersonality, RunningJoke
    print("✅ Family AI Models imported successfully")
except Exception as e:
    print("❌ Family AI Models import failed:")
    traceback.print_exc()

# Test 2: Family AI Service
print("\n2. Testing Family AI Service import...")
try:
    from backend.family_ai_service import FamilyAIService
    print("✅ Family AI Service imported successfully")
except Exception as e:
    print("❌ Family AI Service import failed:")
    traceback.print_exc()

# Test 3: Family AI Endpoints
print("\n3. Testing Family AI Endpoints import...")
try:
    from backend.family_ai_endpoints import router
    print("✅ Family AI Endpoints imported successfully")
except Exception as e:
    print("❌ Family AI Endpoints import failed:")
    traceback.print_exc()

# Test 4: Individual dependencies
print("\n4. Testing individual dependencies...")

dependencies = [
    ("backend.security", "rate_limit"),
    ("backend.database_config", "get_db"),
    ("sqlalchemy.orm", "Session"),
    ("sqlalchemy", "and_")
]

for module, item in dependencies:
    try:
        exec(f"from {module} import {item}")
        print(f"✅ {module}.{item}")
    except Exception as e:
        print(f"❌ {module}.{item}: {e}")

print("\n=== Debug Complete ===")
