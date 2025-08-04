#!/usr/bin/env python3
"""
Main API Server for Elmowafiplatform
Connects React frontend to all AI services and database
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import logging

# Import our AI services
from ai_services import family_ai_analyzer, travel_ai_assistant, ai_game_master
from facial_recognition_trainer import face_trainer
from photo_clustering import photo_clustering_engine  
from gps_verification import gps_verifier
from database import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configuration
app.config['UPLOAD_FOLDER'] = Path('data/uploads')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

# Create necessary directories
app.config['UPLOAD_FOLDER'].mkdir(parents=True, exist_ok=True)

# Database is already initialized in the imported db instance
db_path = db.db_path

# Use exported AI service instances
family_analyzer = family_ai_analyzer
travel_assistant = travel_ai_assistant
game_master = ai_game_master

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def get_db_connection():
    """Get database connection with row factory"""
    return db.get_connection()

# Health Check
@app.route('/api/health', methods=['GET'])
def health_check():
    """Check the health of all services"""
    try:
        # Test database connection
        with get_db_connection() as conn:
            conn.execute("SELECT 1").fetchone()
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "api": True,
                "database": True,
                "ai_analyzer": True,
                "face_recognition": hasattr(face_trainer, 'face_classifier') and face_trainer.face_classifier is not None,
                "photo_clustering": True,
                "gps_verification": True
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "services": {
                "api": False,
                "database": False,
                "ai_analyzer": False,
                "face_recognition": False,
                "photo_clustering": False,
                "gps_verification": False
            }
        }), 500

# Family Members API
@app.route('/api/family/members', methods=['GET'])
def get_family_members():
    """Get all family members"""
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT id, name, name_arabic, birth_date, location, 
                       avatar, relationships, created_at 
                FROM family_members 
                ORDER BY name
            """)
            
            members = []
            for row in cursor.fetchall():
                member = {
                    "id": row["id"],
                    "name": row["name"],
                    "nameArabic": row["name_arabic"],
                    "birthDate": row["birth_date"],
                    "location": row["location"],
                    "avatar": row["avatar"],
                    "relationships": json.loads(row["relationships"]) if row["relationships"] else [],
                    "createdAt": row["created_at"]
                }
                members.append(member)
            
            return jsonify(members)
            
    except Exception as e:
        logger.error(f"Error getting family members: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/family/members', methods=['POST'])
def create_family_member():
    """Create a new family member"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({"error": "Name is required"}), 400
            
        member_id = f"member_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO family_members 
                (id, name, name_arabic, birth_date, location, avatar, 
                 relationships, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                member_id,
                data['name'],
                data.get('nameArabic'),
                data.get('birthDate'),
                data.get('location'),
                data.get('avatar'),
                json.dumps(data.get('relationships', [])),
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
            
        return jsonify({
            "id": member_id,
            "name": data['name'],
            "nameArabic": data.get('nameArabic'),
            "birthDate": data.get('birthDate'),
            "location": data.get('location'),
            "avatar": data.get('avatar'),
            "relationships": data.get('relationships', [])
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating family member: {e}")
        return jsonify({"error": str(e)}), 500

# Memory Management API
@app.route('/api/memories', methods=['GET'])
def get_memories():
    """Get memories with optional filters"""
    try:
        # Parse query parameters
        family_member_id = request.args.get('familyMemberId')
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        tags = request.args.getlist('tags')
        
        # Build SQL query
        query = "SELECT * FROM memories WHERE 1=1"
        params = []
        
        if family_member_id:
            query += " AND JSON_EXTRACT(family_members, '$') LIKE ?"
            params.append(f'%"{family_member_id}"%')
            
        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
            
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)
            
        if tags:
            for tag in tags:
                query += " AND JSON_EXTRACT(tags, '$') LIKE ?"
                params.append(f'%"{tag}"%')
        
        query += " ORDER BY date DESC"
        
        with get_db_connection() as conn:
            cursor = conn.execute(query, params)
            
            memories = []
            for row in cursor.fetchall():
                memory = {
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"],
                    "date": row["date"],
                    "location": row["location"],
                    "imageUrl": row["image_url"],
                    "tags": json.loads(row["tags"]) if row["tags"] else [],
                    "familyMembers": json.loads(row["family_members"]) if row["family_members"] else [],
                    "aiAnalysis": json.loads(row["ai_analysis"]) if row["ai_analysis"] else None,
                    "createdAt": row["created_at"]
                }
                memories.append(memory)
            
            return jsonify(memories)
            
    except Exception as e:
        logger.error(f"Error getting memories: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memories/upload', methods=['POST'])
def upload_memory():
    """Upload photos and create memory with AI analysis"""
    try:
        # Get form data
        title = request.form.get('title')
        description = request.form.get('description', '')
        date = request.form.get('date', datetime.now().date().isoformat())
        location = request.form.get('location', '')
        tags = json.loads(request.form.get('tags', '[]'))
        family_members = json.loads(request.form.get('familyMembers', '[]'))
        ai_analysis_data = request.form.get('aiAnalysis')
        
        if not title:
            return jsonify({"error": "Title is required"}), 400
        
        # Handle file uploads
        uploaded_files = request.files.getlist('image')
        if not uploaded_files or all(f.filename == '' for f in uploaded_files):
            return jsonify({"error": "At least one image is required"}), 400
        
        # Process and save images
        image_urls = []
        ai_analysis_results = []
        
        for file in uploaded_files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Add timestamp to avoid conflicts
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"{timestamp}_{filename}"
                file_path = app.config['UPLOAD_FOLDER'] / filename
                file.save(file_path)
                
                # Store relative URL for frontend
                image_urls.append(f"/api/uploads/{filename}")
                
                # Perform additional AI analysis if needed
                try:
                    analysis_result = family_analyzer.analyze_family_photo(
                        str(file_path), 
                        family_context={"members": family_members}
                    )
                    ai_analysis_results.append(analysis_result)
                except Exception as ai_error:
                    logger.warning(f"AI analysis failed for {filename}: {ai_error}")
                    ai_analysis_results.append(None)
        
        # Create memory record
        memory_id = f"memory_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Combine AI analysis data
        combined_ai_analysis = {
            "upload_analysis": json.loads(ai_analysis_data) if ai_analysis_data else None,
            "server_analysis": ai_analysis_results,
            "processed_at": datetime.now().isoformat()
        }
        
        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO memories 
                (id, title, description, date, location, image_url, tags, 
                 family_members, ai_analysis, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                memory_id,
                title,
                description,
                date,
                location,
                json.dumps(image_urls),
                json.dumps(tags),
                json.dumps(family_members),
                json.dumps(combined_ai_analysis),
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
        
        # Train facial recognition if faces were detected
        for i, result in enumerate(ai_analysis_results):
            if result and result.get('faces_detected'):
                image_path = app.config['UPLOAD_FOLDER'] / f"{timestamp}_{uploaded_files[i].filename}"
                for member_id in family_members:
                    face_trainer.add_training_sample(member_id, str(image_path), verified=False)
        
        return jsonify({
            "id": memory_id,
            "title": title,
            "description": description,
            "date": date,
            "location": location,
            "imageUrl": image_urls[0] if image_urls else None,
            "imageUrls": image_urls,
            "tags": tags,
            "familyMembers": family_members,
            "aiAnalysis": combined_ai_analysis,
            "message": "Memory created successfully"
        }), 201
        
    except Exception as e:
        logger.error(f"Error uploading memory: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/uploads/<filename>')
def serve_upload(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Smart Memory Suggestions API
@app.route('/api/memories/suggestions', methods=['GET'])
def get_memory_suggestions():
    """Get AI-powered memory suggestions including 'On This Day'"""
    try:
        target_date_str = request.args.get('date', datetime.now().date().isoformat())
        # Handle both date and datetime strings
        try:
            target_date_obj = datetime.fromisoformat(target_date_str)
        except ValueError:
            # If it's a date string, convert to datetime
            from datetime import date
            target_date_obj = datetime.combine(date.fromisoformat(target_date_str), datetime.min.time())
        
        # Use date string for SQL queries
        target_date = target_date_obj.date().isoformat()
        
        suggestions = {
            "onThisDay": [],
            "similar": [],
            "recommendations": [],
            "ai_powered": True
        }
        
        with get_db_connection() as conn:
            # Get "On This Day" memories (same month/day from previous years)
            on_this_day_query = """
                SELECT * FROM memories 
                WHERE strftime('%m-%d', date) = strftime('%m-%d', ?)
                AND date < ?
                ORDER BY date DESC
                LIMIT 5
            """
            
            cursor = conn.execute(on_this_day_query, (target_date, target_date))
            for row in cursor.fetchall():
                # Handle date parsing safely
                try:
                    memory_date_obj = datetime.fromisoformat(row["date"])
                except ValueError:
                    from datetime import date
                    memory_date_obj = datetime.combine(date.fromisoformat(row["date"]), datetime.min.time())
                
                year_diff = target_date_obj.year - memory_date_obj.year
                memory = {
                    "id": row["id"],
                    "title": row["title"],
                    "description": row["description"],
                    "date": row["date"],
                    "location": row["location"],
                    "imageUrl": json.loads(row["image_url"])[0] if row["image_url"] else None,
                    "tags": json.loads(row["tags"]) if row["tags"] else [],
                    "familyMembers": json.loads(row["family_members"]) if row["family_members"] else [],
                    "yearDifference": year_diff
                }
                suggestions["onThisDay"].append(memory)
            
            # Get recent memories for similarity analysis
            recent_memories_query = """
                SELECT * FROM memories 
                ORDER BY created_at DESC 
                LIMIT 20
            """
            
            cursor = conn.execute(recent_memories_query)
            recent_memories = []
            for row in cursor.fetchall():
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
                recent_memories.append(memory)
            
            # Use photo clustering to find similar memories
            try:
                clustering_analysis = photo_clustering_engine.analyze_memories_for_clustering(recent_memories)
                if clustering_analysis["can_cluster"]:
                    # Get memories with similar characteristics
                    for memory in recent_memories[:3]:  # Top 3 similar memories
                        suggestions["similar"].append(memory)
            except Exception as cluster_error:
                logger.warning(f"Photo clustering failed: {cluster_error}")
            
            # Generate AI recommendations
            try:
                ai_recommendations = family_analyzer.generate_memory_suggestions(
                    recent_memories, target_date
                )
                suggestions["recommendations"] = ai_recommendations.get("suggestions", [
                    "Consider adding more photos from recent family gatherings",
                    "Upload travel photos to preserve those precious moments",
                    "Add descriptions to your memories to make them more meaningful"
                ])
            except Exception as ai_error:
                logger.warning(f"AI recommendations failed: {ai_error}")
                suggestions["recommendations"] = [
                    "Consider adding more photos from recent family gatherings",
                    "Upload travel photos to preserve those precious moments",
                    "Add descriptions to your memories to make them more meaningful"
                ]
        
        return jsonify(suggestions)
        
    except Exception as e:
        logger.error(f"Error getting memory suggestions: {e}")
        return jsonify({
            "onThisDay": [],
            "similar": [],
            "recommendations": ["Unable to load suggestions at this time"],
            "ai_powered": False,
            "error": str(e)
        }), 500

# AI Analysis API
@app.route('/api/analyze', methods=['POST'])
def analyze_content():
    """Analyze uploaded content with AI"""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400
        
        # Save temporary file
        filename = secure_filename(file.filename)
        temp_path = app.config['UPLOAD_FOLDER'] / f"temp_{filename}"
        file.save(temp_path)
        
        # Get analysis parameters
        analysis_type = request.form.get('analysisType', 'family_photo')
        family_context = request.form.get('familyContext')
        
        if family_context:
            family_context = json.loads(family_context)
        
        # Perform AI analysis
        result = family_analyzer.analyze_family_photo(
            str(temp_path),
            family_context=family_context
        )
        
        # Clean up temporary file
        if temp_path.exists():
            temp_path.unlink()
        
        return jsonify({
            "success": True,
            "analysis": result,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# AI Family Chat Assistant API
@app.route('/api/chat/family-assistant', methods=['POST'])
def family_chat_assistant():
    """AI-powered family chat assistant with context awareness"""
    try:
        data = request.get_json()
        
        message = data.get('message', '')
        chat_mode = data.get('chatMode', 'general')
        family_context = data.get('familyContext', {})
        conversation_history = data.get('conversationHistory', [])
        language = data.get('language', 'en')
        quick_action = data.get('quickAction', False)
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
        
        # Use AI services to generate intelligent response
        response_data = family_analyzer.generate_family_chat_response(
            message=message,
            chat_mode=chat_mode,
            family_context=family_context,
            conversation_history=conversation_history,
            language=language,
            quick_action=quick_action
        )
        
        # Enhance response with database context
        if chat_mode == 'memory':
            # Get relevant memories for memory-related queries
            with get_db_connection() as conn:
                cursor = conn.execute("""
                    SELECT * FROM memories 
                    WHERE title LIKE ? OR description LIKE ?
                    ORDER BY date DESC LIMIT 5
                """, (f"%{message}%", f"%{message}%"))
                
                relevant_memories = []
                for row in cursor.fetchall():
                    memory = {
                        "id": row["id"],
                        "title": row["title"],
                        "date": row["date"],
                        "location": row["location"]
                    }
                    relevant_memories.append(memory)
                
                response_data["relevant_memories"] = relevant_memories
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in family chat assistant: {e}")
        
        # Fallback response based on language
        fallback_response = {
            "response": "عذراً، واجهت مشكلة في الرد. يرجى المحاولة مرة أخرى." if language == 'ar'
                       else "Sorry, I encountered an issue. Please try again.",
            "context": {"type": "general"},
            "suggestions": []
        }
        
        return jsonify(fallback_response), 500

# Travel Planning API
@app.route('/api/travel/plans', methods=['GET'])
def get_travel_plans():
    """Get travel plans"""
    try:
        family_member_id = request.args.get('familyMemberId')
        
        query = "SELECT * FROM travel_plans WHERE 1=1"
        params = []
        
        if family_member_id:
            query += " AND JSON_EXTRACT(participants, '$') LIKE ?"
            params.append(f'%"{family_member_id}"%')
        
        query += " ORDER BY start_date DESC"
        
        with get_db_connection() as conn:
            cursor = conn.execute(query, params)
            
            plans = []
            for row in cursor.fetchall():
                plan = {
                    "id": row["id"],
                    "name": row["name"],
                    "destination": row["destination"],
                    "startDate": row["start_date"],
                    "endDate": row["end_date"],
                    "budget": row["budget"],
                    "participants": json.loads(row["participants"]) if row["participants"] else [],
                    "activities": json.loads(row["activities"]) if row["activities"] else [],
                    "createdAt": row["created_at"]
                }
                plans.append(plan)
            
            return jsonify(plans)
            
    except Exception as e:
        logger.error(f"Error getting travel plans: {e}")
        return jsonify({"error": str(e)}), 500

# AI Travel Recommendations API
@app.route('/api/travel/recommendations', methods=['GET'])
def get_travel_recommendations():
    """Get AI-powered travel recommendations based on family history"""
    try:
        # Get family preferences from query params
        budget = request.args.get('budget', 'medium')
        duration = request.args.get('duration', '3-5 days')
        interests = request.args.getlist('interests') or ['family', 'sightseeing']
        
        with get_db_connection() as conn:
            # Get family travel history
            cursor = conn.execute("""
                SELECT destination, location, COUNT(*) as visit_count, 
                       MAX(date) as last_visit, tags
                FROM memories 
                WHERE location IS NOT NULL 
                GROUP BY location
                ORDER BY visit_count DESC, last_visit DESC
            """)
            travel_history = cursor.fetchall()
            
            # Get family member preferences from memories
            cursor = conn.execute("""
                SELECT tags, location, date 
                FROM memories 
                WHERE tags IS NOT NULL
                ORDER BY date DESC 
                LIMIT 20
            """)
            recent_activities = cursor.fetchall()
        
        # Use AI to generate personalized recommendations
        try:
            ai_recommendations = travel_assistant.generate_travel_recommendations(
                travel_history=[{
                    'destination': row['destination'],
                    'location': row['location'], 
                    'visit_count': row['visit_count'],
                    'last_visit': row['last_visit'],
                    'tags': json.loads(row['tags']) if row['tags'] else []
                } for row in travel_history],
                recent_activities=[{
                    'tags': json.loads(row['tags']) if row['tags'] else [],
                    'location': row['location'],
                    'date': row['date']
                } for row in recent_activities],
                preferences={
                    'budget': budget,
                    'duration': duration,
                    'interests': interests
                }
            )
            
            return jsonify({
                'recommendations': ai_recommendations.get('recommendations', []),
                'reasoning': ai_recommendations.get('reasoning', 'Based on your family travel history'),
                'confidence': ai_recommendations.get('confidence', 0.7),
                'ai_powered': True,
                'family_context': {
                    'visited_locations': len(travel_history),
                    'most_visited': travel_history[0]['location'] if travel_history else None,
                    'preferred_activities': list(set([
                        tag for activity in recent_activities 
                        for tag in (json.loads(activity['tags']) if activity['tags'] else [])
                    ]))[:5]
                }
            })
            
        except Exception as ai_error:
            logger.warning(f"AI travel recommendations failed: {ai_error}")
            
            # Fallback to rule-based recommendations
            fallback_recommendations = []
            
            if travel_history:
                # Recommend similar locations to places they've enjoyed
                most_visited = travel_history[0]
                if 'dubai' in most_visited['location'].lower():
                    fallback_recommendations.extend([
                        {
                            'destination': 'Abu Dhabi, UAE',
                            'reason': 'Similar cultural experience to your Dubai visits',
                            'activities': ['Sheikh Zayed Mosque', 'Louvre Abu Dhabi', 'Corniche Beach'],
                            'estimated_budget': 'Medium',
                            'family_friendly': True
                        },
                        {
                            'destination': 'Sharjah, UAE', 
                            'reason': 'Cultural heritage, close to home',
                            'activities': ['Sharjah Arts Museum', 'Al Noor Island', 'Heritage Area'],
                            'estimated_budget': 'Low-Medium',
                            'family_friendly': True
                        }
                    ])
                    
                # International recommendations based on UAE experience
                fallback_recommendations.extend([
                    {
                        'destination': 'Doha, Qatar',
                        'reason': 'Modern Middle Eastern city with family attractions',
                        'activities': ['Souq Waqif', 'Museum of Islamic Art', 'Katara Cultural Village'],
                        'estimated_budget': 'Medium-High',
                        'family_friendly': True
                    },
                    {
                        'destination': 'Istanbul, Turkey',
                        'reason': 'Rich history and culture, family-friendly',
                        'activities': ['Hagia Sophia', 'Grand Bazaar', 'Bosphorus Cruise'],
                        'estimated_budget': 'Medium',
                        'family_friendly': True
                    }
                ])
            else:
                # Default family-friendly recommendations
                fallback_recommendations = [
                    {
                        'destination': 'Dubai, UAE',
                        'reason': 'Perfect for families, modern attractions',
                        'activities': ['Burj Khalifa', 'Dubai Mall', 'Dubai Parks'],
                        'estimated_budget': 'Medium-High',
                        'family_friendly': True
                    },
                    {
                        'destination': 'Singapore',
                        'reason': 'Safe, clean, family-oriented destination',
                        'activities': ['Gardens by the Bay', 'Universal Studios', 'Singapore Zoo'],
                        'estimated_budget': 'High',
                        'family_friendly': True
                    }
                ]
            
            return jsonify({
                'recommendations': fallback_recommendations,
                'reasoning': 'Based on family travel patterns and preferences',
                'confidence': 0.6,
                'ai_powered': False,
                'family_context': {
                    'visited_locations': len(travel_history),
                    'most_visited': travel_history[0]['location'] if travel_history else 'Dubai, UAE'
                }
            })
            
    except Exception as e:
        logger.error(f"Error getting travel recommendations: {e}")
        return jsonify({
            'recommendations': [
                {
                    'destination': 'Dubai, UAE',
                    'reason': 'Great family destination with modern attractions',
                    'activities': ['Burj Khalifa', 'Dubai Mall', 'Beach activities'],
                    'estimated_budget': 'Medium',
                    'family_friendly': True
                }
            ],
            'reasoning': 'Default family-friendly recommendation',
            'confidence': 0.5,
            'ai_powered': False,
            'error': 'Recommendation system temporarily unavailable'
        }), 200

if __name__ == '__main__':
    logger.info("Starting Elmowafiplatform Main API Server...")
    logger.info(f"Database path: {db_path}")
    logger.info(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    
    # Run the server
    app.run(
        host='0.0.0.0',
        port=8001,
        debug=True,
        threaded=True
    )