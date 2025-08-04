#!/usr/bin/env python3
"""
Debug memory suggestions endpoint to identify 500 error
"""

import sqlite3
import json
from datetime import datetime
from ai_services import family_ai_analyzer
from photo_clustering import photo_clustering_engine

def debug_memory_suggestions():
    """Debug the memory suggestions logic"""
    
    print("Debugging Memory Suggestions...")
    
    # Test database connection
    try:
        db_path = "data/elmowafiplatform.db"
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        print("[OK] Database connection successful")
        
        # Test basic query
        cursor = conn.execute("SELECT COUNT(*) as count FROM memories")
        count = cursor.fetchone()[0]
        print(f"[OK] Found {count} memories in database")
        
        # Test "On This Day" query
        target_date = datetime.now().date().isoformat()
        print(f"Testing with target date: {target_date}")
        
        on_this_day_query = """
            SELECT * FROM memories 
            WHERE strftime('%m-%d', date) = strftime('%m-%d', ?)
            AND date < ?
            ORDER BY date DESC
            LIMIT 5
        """
        
        cursor = conn.execute(on_this_day_query, (target_date, target_date))
        on_this_day_results = cursor.fetchall()
        print(f"[OK] On This Day query returned {len(on_this_day_results)} results")
        
        # Test recent memories query
        recent_memories_query = """
            SELECT * FROM memories 
            ORDER BY created_at DESC 
            LIMIT 20
        """
        
        cursor = conn.execute(recent_memories_query)
        recent_memories = cursor.fetchall()
        print(f"[OK] Recent memories query returned {len(recent_memories)} results")
        
        # Test JSON parsing
        for row in recent_memories[:2]:
            try:
                if row["image_url"]:
                    image_urls = json.loads(row["image_url"])
                    print(f"[OK] Parsed image URLs: {len(image_urls)} images")
                
                if row["tags"]:
                    tags = json.loads(row["tags"])
                    print(f"[OK] Parsed tags: {tags}")
                
                if row["family_members"]:
                    family_members = json.loads(row["family_members"])
                    print(f"[OK] Parsed family members: {family_members}")
                    
            except Exception as parse_error:
                print(f"[FAIL] JSON parsing error: {parse_error}")
                return
        
        # Test photo clustering (this might be the issue)
        try:
            print("Testing photo clustering...")
            
            # Convert rows to dictionaries for clustering
            memory_dicts = []
            for row in recent_memories[:5]:  # Test with first 5
                memory = {
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"],
                    "date": row["date"],
                    "location": row["location"],
                    "imageUrl": json.loads(row["image_url"])[0] if row["image_url"] else None,
                    "tags": json.loads(row["tags"]) if row["tags"] else [],
                    "familyMembers": json.loads(row["family_members"]) if row["family_members"] else []
                }
                memory_dicts.append(memory)
            
            clustering_analysis = photo_clustering_engine.analyze_memories_for_clustering(memory_dicts)
            print(f"[OK] Photo clustering analysis: {clustering_analysis}")
            
        except Exception as clustering_error:
            print(f"[FAIL] Photo clustering error: {clustering_error}")
            print("This might be the cause of the 500 error")
        
        # Test AI recommendations
        try:
            print("Testing AI recommendations...")
            ai_recommendations = family_ai_analyzer.generate_memory_suggestions(
                memory_dicts, target_date
            )
            print(f"[OK] AI recommendations: {ai_recommendations}")
            
        except Exception as ai_error:
            print(f"[FAIL] AI recommendations error: {ai_error}")
            print("This might be the cause of the 500 error")
        
        conn.close()
        print("\n[OK] Memory suggestions debugging completed successfully!")
        
    except Exception as e:
        print(f"[FAIL] Database error: {e}")

if __name__ == "__main__":
    debug_memory_suggestions()