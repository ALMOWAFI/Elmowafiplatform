#!/usr/bin/env python3
"""
Comprehensive Testing Suite for Elmowafiplatform API
Tests all endpoints, authentication, AI services, and data management
"""

import pytest
import asyncio
import json
import os
import tempfile
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List
import requests
from fastapi.testclient import TestClient
from PIL import Image
import io

# Import the main app
import sys
sys.path.append('.')
from main import app
from auth import users_db
from database import DATABASE_PATH

# Test client
client = TestClient(app)

class TestElmowafiplatformAPI:
    """Comprehensive test suite for the Elmowafiplatform API"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.test_user = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "TestPassword123!"
        }
        cls.auth_token = None
        cls.test_db_path = "data/test_elmowafiplatform.db"
        
        # Create test database
        cls._setup_test_database()
        
        # Register test user and get token
        cls._register_and_login()
    
    @classmethod
    def _setup_test_database(cls):
        """Set up test database"""
        # Create test data directory
        Path("data").mkdir(exist_ok=True)
        
        # Initialize test database
        conn = sqlite3.connect(cls.test_db_path)
        
        # Create necessary tables
        conn.execute("""
            CREATE TABLE IF NOT EXISTS family_members (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                relationship TEXT,
                birth_date TEXT,
                email TEXT,
                phone TEXT,
                profile_image TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                date TEXT,
                location TEXT,
                image_url TEXT,
                family_members TEXT,
                tags TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS travel_plans (
                id TEXT PRIMARY KEY,
                destination TEXT NOT NULL,
                start_date TEXT,
                end_date TEXT,
                description TEXT,
                participants TEXT,
                status TEXT DEFAULT 'planned',
                created_at TEXT NOT NULL
            )
        """)
        
        # Insert test data
        cls._insert_test_data(conn)
        
        conn.commit()
        conn.close()
    
    @classmethod
    def _insert_test_data(cls, conn):
        """Insert test data for testing"""
        # Test family members
        test_members = [
            ("mem1", "Alice Johnson", "Mother", "1980-05-15", "alice@example.com", "+1234567890", None, datetime.now().isoformat()),
            ("mem2", "Bob Johnson", "Father", "1978-03-20", "bob@example.com", "+1234567891", None, datetime.now().isoformat()),
            ("mem3", "Charlie Johnson", "Son", "2005-08-10", "charlie@example.com", "+1234567892", None, datetime.now().isoformat())
        ]
        
        for member in test_members:
            conn.execute("""
                INSERT INTO family_members 
                (id, name, relationship, birth_date, email, phone, profile_image, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, member)
        
        # Test memories
        test_memories = [
            ("memo1", "Family Beach Trip", "Amazing day at the beach", "2024-07-15", "Miami Beach", None, '["mem1", "mem2", "mem3"]', '["beach", "family", "vacation"]', datetime.now().isoformat()),
            ("memo2", "Birthday Party", "Charlie's 18th birthday celebration", "2024-08-10", "Home", None, '["mem1", "mem2", "mem3"]', '["birthday", "celebration", "family"]', datetime.now().isoformat())
        ]
        
        for memory in test_memories:
            conn.execute("""
                INSERT INTO memories 
                (id, title, description, date, location, image_url, family_members, tags, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, memory)
        
        # Test travel plans
        test_travel = [
            ("trip1", "Paris Vacation", "2024-12-20", "2024-12-27", "Family trip to Paris", '["mem1", "mem2", "mem3"]', "planned", datetime.now().isoformat()),
            ("trip2", "Weekend Getaway", "2024-11-15", "2024-11-17", "Quick trip to the mountains", '["mem1", "mem2"]', "planned", datetime.now().isoformat())
        ]
        
        for trip in test_travel:
            conn.execute("""
                INSERT INTO travel_plans 
                (id, destination, start_date, end_date, description, participants, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, trip)
    
    @classmethod
    def _register_and_login(cls):
        """Register test user and get authentication token"""
        # Register user
        register_response = client.post("/api/auth/register", json=cls.test_user)
        assert register_response.status_code == 200
        
        # Login and get token
        login_response = client.post("/api/auth/login", json={
            "email": cls.test_user["email"],
            "password": cls.test_user["password"]
        })
        assert login_response.status_code == 200
        
        cls.auth_token = login_response.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.auth_token}"}
    
    @classmethod
    def teardown_class(cls):
        """Clean up after tests"""
        # Remove test database
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
        
        # Clean up test user from auth system
        if cls.test_user["email"] in users_db:
            del users_db[cls.test_user["email"]]

    # ========== AUTHENTICATION TESTS ==========
    
    def test_user_registration(self):
        """Test user registration"""
        new_user = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "NewPassword123!"
        }
        
        response = client.post("/api/auth/register", json=new_user)
        assert response.status_code == 200
        
        result = response.json()
        assert result["username"] == new_user["username"]
        assert result["email"] == new_user["email"]
        assert "password" not in result  # Password should not be returned
    
    def test_user_login(self):
        """Test user login"""
        response = client.post("/api/auth/login", json={
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        })
        
        assert response.status_code == 200
        result = response.json()
        assert "access_token" in result
        assert result["token_type"] == "bearer"
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = client.post("/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
    
    def test_protected_endpoint_without_token(self):
        """Test accessing protected endpoint without token"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401
    
    def test_protected_endpoint_with_token(self):
        """Test accessing protected endpoint with valid token"""
        response = client.get("/api/auth/me", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["email"] == self.test_user["email"]

    # ========== FAMILY MANAGEMENT TESTS ==========
    
    def test_get_family_members(self):
        """Test getting family members"""
        response = client.get("/api/family/members", headers=self.auth_headers)
        assert response.status_code == 200
        
        members = response.json()
        assert isinstance(members, list)
        assert len(members) >= 3  # We inserted 3 test members
    
    def test_add_family_member(self):
        """Test adding a new family member"""
        new_member = {
            "name": "Diana Johnson",
            "relationship": "Daughter",
            "birthDate": "2010-12-05",
            "email": "diana@example.com",
            "phone": "+1234567893"
        }
        
        response = client.post("/api/family/members", json=new_member, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["name"] == new_member["name"]
        assert "id" in result
    
    def test_update_family_member(self):
        """Test updating a family member"""
        # First get existing member
        response = client.get("/api/family/members", headers=self.auth_headers)
        members = response.json()
        member_id = members[0]["id"]
        
        updated_data = {
            "name": "Alice Smith Johnson",
            "relationship": "Mother",
            "email": "alice.smith@example.com"
        }
        
        response = client.put(f"/api/family/members/{member_id}", json=updated_data, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["name"] == updated_data["name"]

    # ========== MEMORY MANAGEMENT TESTS ==========
    
    def test_get_memories(self):
        """Test getting memories"""
        response = client.get("/api/memories", headers=self.auth_headers)
        assert response.status_code == 200
        
        memories = response.json()
        assert isinstance(memories, list)
        assert len(memories) >= 2  # We inserted 2 test memories
    
    def test_add_memory(self):
        """Test adding a new memory"""
        new_memory = {
            "title": "Graduation Day",
            "description": "Charlie's high school graduation",
            "date": "2024-06-15",
            "location": "City High School",
            "familyMembers": ["mem3"],
            "tags": ["graduation", "achievement", "education"]
        }
        
        response = client.post("/api/memories", json=new_memory, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["title"] == new_memory["title"]
        assert "id" in result
    
    def test_memory_upload_photo(self):
        """Test uploading photo for memory"""
        # Create a test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {"file": ("test_photo.jpg", img_bytes, "image/jpeg")}
        data = {"memory_id": "memo1"}
        
        response = client.post("/api/memories/upload", files=files, data=data, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "imageUrl" in result

    # ========== TRAVEL PLANNING TESTS ==========
    
    def test_get_travel_plans(self):
        """Test getting travel plans"""
        response = client.get("/api/travel/plans", headers=self.auth_headers)
        assert response.status_code == 200
        
        plans = response.json()
        assert isinstance(plans, list)
        assert len(plans) >= 2  # We inserted 2 test plans
    
    def test_create_travel_plan(self):
        """Test creating a new travel plan"""
        new_plan = {
            "destination": "Tokyo, Japan",
            "startDate": "2025-03-15",
            "endDate": "2025-03-22",
            "description": "Spring cherry blossom tour",
            "participants": ["mem1", "mem2"]
        }
        
        response = client.post("/api/travel/plans", json=new_plan, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["destination"] == new_plan["destination"]
        assert "id" in result
    
    def test_get_travel_recommendations(self):
        """Test getting AI travel recommendations"""
        response = client.post("/api/travel/recommendations", json={
            "destination": "Rome, Italy",
            "familyPreferences": {
                "interests": ["history", "culture"],
                "duration_days": 7,
                "members": ["mem1", "mem2", "mem3"]
            }
        }, headers=self.auth_headers)
        
        assert response.status_code == 200
        result = response.json()
        assert "destination_analysis" in result
        assert "family_activities" in result

    # ========== AI SERVICES TESTS ==========
    
    def test_ai_photo_analysis(self):
        """Test AI photo analysis endpoint"""
        # Create a test image
        img = Image.new('RGB', (200, 200), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {"file": ("test_photo.jpg", img_bytes, "image/jpeg")}
        data = {"family_context": json.dumps([{"id": "mem1", "name": "Alice"}])}
        
        response = client.post("/api/ai/analyze-photo", files=files, data=data, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["success"] is True
        assert "analysis" in result
        assert "ai_services_used" in result
    
    def test_ai_platform_insights(self):
        """Test AI platform insights"""
        response = client.get("/api/ai/platform-insights", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "family_statistics" in result
        assert "ai_system_status" in result
        assert "recommendations" in result
    
    def test_ai_face_recognition_status(self):
        """Test face recognition status"""
        response = client.get("/api/ai/face-recognition-status", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "available" in result
        # Response depends on whether face_recognition library is installed
    
    def test_ai_album_suggestions(self):
        """Test AI album suggestions"""
        response = client.get("/api/ai/album-suggestions", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "success" in result
        assert "suggestions" in result

    # ========== GAMING TESTS ==========
    
    def test_create_mafia_game(self):
        """Test creating a Mafia game"""
        game_data = {
            "gameType": "mafia",
            "players": [
                {"id": "mem1", "name": "Alice"},
                {"id": "mem2", "name": "Bob"},
                {"id": "mem3", "name": "Charlie"},
                {"id": "mem4", "name": "Diana"}
            ]
        }
        
        response = client.post("/api/gaming/create-game", json=game_data, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "gameId" in result
        assert result["gameType"] == "mafia"
    
    def test_get_game_leaderboard(self):
        """Test getting game leaderboard"""
        response = client.get("/api/gaming/leaderboard", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert isinstance(result, list)

    # ========== CULTURAL FEATURES TESTS ==========
    
    def test_get_cultural_content(self):
        """Test getting cultural content"""
        response = client.get("/api/cultural/content", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "islamicCalendar" in result
        assert "culturalEvents" in result
    
    def test_translate_text(self):
        """Test text translation"""
        translation_data = {
            "text": "Hello family",
            "targetLanguage": "ar"
        }
        
        response = client.post("/api/cultural/translate", json=translation_data, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "translatedText" in result

    # ========== DATA MANAGEMENT TESTS ==========
    
    def test_export_data_json(self):
        """Test exporting data as JSON"""
        response = client.post("/api/data/export", json={"format": "json"}, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "download_url" in result
        assert result["format"] == "json"
    
    def test_export_data_csv(self):
        """Test exporting data as CSV"""
        response = client.post("/api/data/export", json={"format": "csv"}, headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "download_url" in result
        assert result["format"] == "csv"
    
    def test_backup_database(self):
        """Test database backup"""
        response = client.post("/api/data/backup", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "backup_file" in result
        assert result["success"] is True
    
    def test_get_exports_list(self):
        """Test getting list of exports"""
        response = client.get("/api/data/exports", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert isinstance(result, list)

    # ========== REAL-TIME FEATURES TESTS ==========
    
    def test_get_realtime_status(self):
        """Test getting real-time status"""
        response = client.get("/api/realtime/status", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "active_connections" in result
        assert "server_time" in result
    
    def test_get_family_online_status(self):
        """Test getting family online status"""
        response = client.get("/api/realtime/family-status", headers=self.auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert isinstance(result, list)

    # ========== HEALTH CHECK TESTS ==========
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/api/health")
        assert response.status_code == 200
        
        result = response.json()
        assert result["status"] == "healthy"
        assert "version" in result
        assert "timestamp" in result
    
    def test_system_status(self):
        """Test system status endpoint"""
        response = client.get("/api/health/system")
        assert response.status_code == 200
        
        result = response.json()
        assert "database" in result
        assert "ai_services" in result
        assert "storage" in result

    # ========== ERROR HANDLING TESTS ==========
    
    def test_invalid_endpoint(self):
        """Test accessing invalid endpoint"""
        response = client.get("/api/invalid/endpoint", headers=self.auth_headers)
        assert response.status_code == 404
    
    def test_missing_required_fields(self):
        """Test API with missing required fields"""
        response = client.post("/api/family/members", json={}, headers=self.auth_headers)
        assert response.status_code == 422  # Validation error
    
    def test_invalid_json(self):
        """Test API with invalid JSON"""
        response = client.post(
            "/api/family/members", 
            data="invalid json", 
            headers={**self.auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/family/members", headers=invalid_headers)
        assert response.status_code == 401

    # ========== PERFORMANCE TESTS ==========
    
    def test_concurrent_requests(self):
        """Test handling concurrent requests"""
        import concurrent.futures
        import time
        
        def make_request():
            return client.get("/api/family/members", headers=self.auth_headers)
        
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        end_time = time.time()
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200
        
        # Should complete within reasonable time (adjust threshold as needed)
        assert end_time - start_time < 5.0
    
    def test_large_data_handling(self):
        """Test handling large data sets"""
        # Create memory with large description
        large_memory = {
            "title": "Large Memory Test",
            "description": "A" * 10000,  # 10KB description
            "date": "2024-01-01",
            "location": "Test Location",
            "familyMembers": ["mem1"],
            "tags": ["test", "large"]
        }
        
        response = client.post("/api/memories", json=large_memory, headers=self.auth_headers)
        assert response.status_code == 200

    # ========== INTEGRATION TESTS ==========
    
    def test_end_to_end_memory_workflow(self):
        """Test complete memory creation workflow"""
        # 1. Create memory
        memory_data = {
            "title": "E2E Test Memory",
            "description": "End-to-end test memory",
            "date": "2024-01-15",
            "location": "Test Location",
            "familyMembers": ["mem1", "mem2"],
            "tags": ["test", "e2e"]
        }
        
        response = client.post("/api/memories", json=memory_data, headers=self.auth_headers)
        assert response.status_code == 200
        memory = response.json()
        memory_id = memory["id"]
        
        # 2. Upload photo
        img = Image.new('RGB', (100, 100), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
        data = {"memory_id": memory_id}
        
        response = client.post("/api/memories/upload", files=files, data=data, headers=self.auth_headers)
        assert response.status_code == 200
        
        # 3. Get memory and verify
        response = client.get("/api/memories", headers=self.auth_headers)
        assert response.status_code == 200
        
        memories = response.json()
        created_memory = next((m for m in memories if m["id"] == memory_id), None)
        assert created_memory is not None
        assert created_memory["title"] == memory_data["title"]
    
    def test_family_interaction_workflow(self):
        """Test family member interaction workflow"""
        # 1. Add family member
        member_data = {
            "name": "Test Member",
            "relationship": "Friend",
            "email": "test.member@example.com"
        }
        
        response = client.post("/api/family/members", json=member_data, headers=self.auth_headers)
        assert response.status_code == 200
        member = response.json()
        member_id = member["id"]
        
        # 2. Create memory with this member
        memory_data = {
            "title": "Memory with Test Member",
            "description": "Testing family interaction",
            "date": "2024-01-20",
            "familyMembers": [member_id],
            "tags": ["test", "interaction"]
        }
        
        response = client.post("/api/memories", json=memory_data, headers=self.auth_headers)
        assert response.status_code == 200
        
        # 3. Verify member appears in memory
        response = client.get("/api/memories", headers=self.auth_headers)
        memories = response.json()
        test_memory = next((m for m in memories if m["title"] == memory_data["title"]), None)
        assert test_memory is not None
        assert member_id in test_memory["familyMembers"]


def run_tests():
    """Run all tests with reporting"""
    import subprocess
    import sys
    
    print("🧪 Starting Elmowafiplatform API Test Suite...")
    print("=" * 60)
    
    try:
        # Run pytest with detailed output
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            __file__, 
            "-v", 
            "--tb=short",
            "--color=yes",
            "--durations=10"
        ], capture_output=True, text=True)
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("\nSTDERR:")
            print(result.stderr)
        
        print(f"\n{'=' * 60}")
        if result.returncode == 0:
            print("✅ All tests passed successfully!")
        else:
            print("❌ Some tests failed!")
            
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False


if __name__ == "__main__":
    # Run tests if executed directly
    run_tests() 