#!/usr/bin/env python3
"""
Seed database with sample family data for testing
"""

import sqlite3
import json
from datetime import datetime, timedelta
import random

def seed_database(db_path: str = "data/elmowafiplatform.db"):
    """Seed database with sample family data"""
    
    conn = sqlite3.connect(db_path)
    
    # Sample family members
    family_members = [
        {
            "id": "member_001",
            "name": "Ahmed Al-Mansouri",
            "name_arabic": "أحمد المنصوري",
            "birth_date": "1975-03-15",
            "location": "Dubai, UAE",
            "avatar": None,
            "relationships": json.dumps([
                {"memberId": "member_002", "type": "spouse"},
                {"memberId": "member_003", "type": "child"},
                {"memberId": "member_004", "type": "child"}
            ])
        },
        {
            "id": "member_002", 
            "name": "Fatima Al-Mansouri",
            "name_arabic": "فاطمة المنصوري",
            "birth_date": "1978-07-22",
            "location": "Dubai, UAE",
            "avatar": None,
            "relationships": json.dumps([
                {"memberId": "member_001", "type": "spouse"},
                {"memberId": "member_003", "type": "child"},
                {"memberId": "member_004", "type": "child"}
            ])
        },
        {
            "id": "member_003",
            "name": "Omar Al-Mansouri", 
            "name_arabic": "عمر المنصوري",
            "birth_date": "2005-12-10",
            "location": "Dubai, UAE",
            "avatar": None,
            "relationships": json.dumps([
                {"memberId": "member_001", "type": "parent"},
                {"memberId": "member_002", "type": "parent"},
                {"memberId": "member_004", "type": "sibling"}
            ])
        },
        {
            "id": "member_004",
            "name": "Layla Al-Mansouri",
            "name_arabic": "ليلى المنصوري", 
            "birth_date": "2008-05-18",
            "location": "Dubai, UAE",
            "avatar": None,
            "relationships": json.dumps([
                {"memberId": "member_001", "type": "parent"},
                {"memberId": "member_002", "type": "parent"},
                {"memberId": "member_003", "type": "sibling"}
            ])
        }
    ]
    
    # Insert family members
    for member in family_members:
        conn.execute("""
            INSERT OR REPLACE INTO family_members 
            (id, name, name_arabic, birth_date, location, avatar, relationships, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            member["id"],
            member["name"],
            member["name_arabic"], 
            member["birth_date"],
            member["location"],
            member["avatar"],
            member["relationships"],
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
    
    # Sample memories with different dates to test "On This Day"
    base_date = datetime.now()
    sample_memories = [
        {
            "id": "memory_001",
            "title": "Family Trip to Burj Khalifa",
            "description": "Amazing family outing to the tallest building in the world. The kids were so excited!",
            "date": (base_date - timedelta(days=365)).date().isoformat(),  # Exactly one year ago
            "location": "Burj Khalifa, Dubai, UAE",
            "image_url": json.dumps(["/api/uploads/sample_burj_khalifa.jpg"]),
            "tags": json.dumps(["family", "travel", "dubai", "burj khalifa", "sightseeing"]),
            "family_members": json.dumps(["member_001", "member_002", "member_003", "member_004"]),
            "ai_analysis": json.dumps({
                "faces": {"count": 4},
                "smart_tags": ["family", "outdoor", "tourist_attraction"],
                "location_analysis": {"confidence": 0.95, "detected_location": "Burj Khalifa"}
            })
        },
        {
            "id": "memory_002", 
            "title": "Omar's Birthday Celebration",
            "description": "Omar turned 18! We had a wonderful family celebration at home.",
            "date": (base_date - timedelta(days=30)).date().isoformat(),  # One month ago
            "location": "Home, Dubai, UAE",
            "image_url": json.dumps(["/api/uploads/sample_birthday.jpg"]),
            "tags": json.dumps(["birthday", "family", "celebration", "omar", "home"]),
            "family_members": json.dumps(["member_001", "member_002", "member_003", "member_004"]),
            "ai_analysis": json.dumps({
                "faces": {"count": 4},
                "smart_tags": ["birthday", "cake", "indoor", "celebration"],
                "scene_analysis": {"activity": "birthday_party", "confidence": 0.88}
            })
        },
        {
            "id": "memory_003",
            "title": "Beach Day at JBR",
            "description": "Perfect family day at Jumeirah Beach Residence. The weather was beautiful!",
            "date": (base_date - timedelta(days=7)).date().isoformat(),  # One week ago  
            "location": "Jumeirah Beach Residence, Dubai, UAE",
            "image_url": json.dumps(["/api/uploads/sample_beach.jpg"]),
            "tags": json.dumps(["beach", "family", "jbr", "outdoor", "summer"]),
            "family_members": json.dumps(["member_001", "member_002", "member_003", "member_004"]),
            "ai_analysis": json.dumps({
                "faces": {"count": 4},
                "smart_tags": ["beach", "outdoor", "swimming", "family"],
                "scene_analysis": {"activity": "beach_visit", "location_type": "beach", "confidence": 0.92}
            })
        },
        {
            "id": "memory_004",
            "title": "Traditional Iftar with Extended Family",
            "description": "Beautiful Ramadan iftar gathering with all the cousins and grandparents.",
            "date": (base_date - timedelta(days=100)).date().isoformat(),
            "location": "Grandparents' House, Sharjah, UAE", 
            "image_url": json.dumps(["/api/uploads/sample_iftar.jpg"]),
            "tags": json.dumps(["ramadan", "iftar", "family", "tradition", "extended_family"]),
            "family_members": json.dumps(["member_001", "member_002", "member_003", "member_004"]),
            "ai_analysis": json.dumps({
                "faces": {"count": 8},
                "smart_tags": ["traditional", "food", "indoor", "gathering"],
                "cultural_context": {"arabic_culture": True, "religious_significance": True}
            })
        },
        {
            "id": "memory_005",
            "title": "Layla's School Achievement",
            "description": "Layla received an award for excellence in mathematics. We're so proud!",
            "date": (base_date - timedelta(days=2)).date().isoformat(),  # Two days ago
            "location": "Dubai International Academy",
            "image_url": json.dumps(["/api/uploads/sample_award.jpg"]),
            "tags": json.dumps(["school", "achievement", "layla", "mathematics", "award"]),
            "family_members": json.dumps(["member_001", "member_002", "member_004"]),
            "ai_analysis": json.dumps({
                "faces": {"count": 3},
                "smart_tags": ["school", "achievement", "indoor", "formal"],
                "scene_analysis": {"activity": "award_ceremony", "confidence": 0.85}
            })
        },
        {
            "id": "memory_006",
            "title": "Family Hike in Hatta Mountains", 
            "description": "Adventure day in the beautiful Hatta mountains. Great exercise and bonding time!",
            "date": base_date.date().isoformat(),  # Today (same month/day as potential "On This Day")
            "location": "Hatta Mountains, Dubai, UAE",
            "image_url": json.dumps(["/api/uploads/sample_hike.jpg"]),
            "tags": json.dumps(["hiking", "mountains", "adventure", "family", "outdoor"]),
            "family_members": json.dumps(["member_001", "member_002", "member_003", "member_004"]),
            "ai_analysis": json.dumps({
                "faces": {"count": 4},
                "smart_tags": ["hiking", "mountains", "outdoor", "adventure"],
                "scene_analysis": {"activity": "hiking", "location_type": "mountains", "confidence": 0.90}
            })
        }
    ]
    
    # Insert memories
    for memory in sample_memories:
        conn.execute("""
            INSERT OR REPLACE INTO memories 
            (id, title, description, date, location, image_url, tags, family_members, ai_analysis, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            memory["id"],
            memory["title"],
            memory["description"],
            memory["date"],
            memory["location"],
            memory["image_url"],
            memory["tags"],
            memory["family_members"],
            memory["ai_analysis"],
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
    
    # Sample memory suggestions for smart recommendations
    memory_suggestions = [
        {
            "id": "suggestion_001",
            "memory_id": "memory_001",
            "suggestion_type": "on_this_day",
            "suggested_to_user": "member_001",
            "suggestion_date": datetime.now().date().isoformat(),
            "relevance_score": 0.95,
            "user_interaction": None,
            "created_at": datetime.now().isoformat()
        },
        {
            "id": "suggestion_002", 
            "memory_id": "memory_003",
            "suggestion_type": "similar_content",
            "suggested_to_user": "member_001",
            "suggestion_date": datetime.now().date().isoformat(),
            "relevance_score": 0.78,
            "user_interaction": None,
            "created_at": datetime.now().isoformat()
        }
    ]
    
    # Insert memory suggestions
    for suggestion in memory_suggestions:
        conn.execute("""
            INSERT OR REPLACE INTO memory_suggestions
            (id, memory_id, suggestion_type, suggested_to_user, suggestion_date, 
             relevance_score, user_interaction, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            suggestion["id"],
            suggestion["memory_id"],
            suggestion["suggestion_type"], 
            suggestion["suggested_to_user"],
            suggestion["suggestion_date"],
            suggestion["relevance_score"],
            suggestion["user_interaction"],
            suggestion["created_at"]
        ))
    
    conn.commit()
    conn.close()
    
    print("Database seeded successfully with sample family data!")
    print(f"   - Added {len(family_members)} family members")
    print(f"   - Added {len(sample_memories)} memories") 
    print(f"   - Added {len(memory_suggestions)} memory suggestions")
    print("\nSample family: Al-Mansouri Family")
    print("   - Ahmed (Father) & Fatima (Mother)")
    print("   - Omar (Son, 18) & Layla (Daughter, 15)")
    print("\nMemories include:")
    print("   - Family trip to Burj Khalifa (1 year ago - for 'On This Day' testing)")
    print("   - Recent beach day, birthday celebration, and school achievement")
    print("   - Traditional Ramadan iftar with extended family")

if __name__ == "__main__":
    # Ensure data directory exists
    import os
    os.makedirs("data", exist_ok=True)
    
    # Seed the database
    seed_database()