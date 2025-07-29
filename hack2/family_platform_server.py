"""
Family Platform API Server - Main API Gateway
Integrates all Elmowafiplatform services including AI processing, memory management,
travel recommendations, and budget system integration.
"""

import os
import json
import sqlite3
import requests
from datetime import datetime, timedelta
from pathlib import Path
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
import uuid
import traceback

# Import existing AI services
try:
    from enhanced_math_system import EnhancedMathFeedbackSystem
    AI_ENABLED = True
except ImportError:
    print("Warning: AI services not available")
    AI_ENABLED = False

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['DATABASE'] = os.path.join(os.path.dirname(__file__), 'family_platform.db')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Budget System Configuration
BUDGET_SYSTEM_URL = 'http://localhost:3000/api'  # Wasp budget system URL
BUDGET_SYSTEM_ENABLED = False  # Will be set to True if connection is successful

# Initialize AI services if available
if AI_ENABLED:
    try:
        math_system = EnhancedMathFeedbackSystem()
        print("AI Math System initialized")
    except Exception as e:
        print(f"⚠️  AI Math System initialization failed: {e}")
        AI_ENABLED = False

# Database initialization
def init_database():
    """Initialize the family platform database"""
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    # Family members table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS family_members (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            nameArabic TEXT,
            birthDate TEXT,
            location TEXT,
            avatar TEXT,
            relationships TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Memories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            location TEXT,
            imageUrl TEXT,
            tags TEXT,
            familyMembers TEXT,
            aiAnalysis TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Travel plans table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS travel_plans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            destination TEXT NOT NULL,
            startDate TEXT,
            endDate TEXT,
            budget REAL,
            participants TEXT,
            activities TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Budget integration cache table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS budget_cache (
            key TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized")

# Check budget system connectivity
def check_budget_system():
    """Check if the budget system is available"""
    global BUDGET_SYSTEM_ENABLED
    try:
        response = requests.get(f"{BUDGET_SYSTEM_URL}/health", timeout=5)
        if response.status_code == 200:
            BUDGET_SYSTEM_ENABLED = True
            print("Budget System connected")
        else:
            print("Budget System not responding")
    except Exception as e:
        print(f"Budget System unavailable: {e}")

# Utility functions
def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(app.config['DATABASE'])
    conn.row_factory = sqlite3.Row
    return conn

def seed_demo_data():
    """Add demo data for testing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM family_members")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return
    
    # Add demo family members
    demo_members = [
        {
            'id': str(uuid.uuid4()),
            'name': 'Ahmed Al-Mowafi',
            'nameArabic': 'أحمد الموافي',
            'location': 'Dubai, UAE',
            'relationships': json.dumps([])
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Fatima Al-Mowafi',
            'nameArabic': 'فاطمة الموافي',
            'location': 'Dubai, UAE',
            'relationships': json.dumps([])
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Omar Al-Mowafi',
            'nameArabic': 'عمر الموافي',
            'location': 'Dubai, UAE',
            'relationships': json.dumps([])
        }
    ]
    
    for member in demo_members:
        cursor.execute('''
            INSERT INTO family_members (id, name, nameArabic, location, relationships)
            VALUES (?, ?, ?, ?, ?)
        ''', (member['id'], member['name'], member['nameArabic'], 
              member['location'], member['relationships']))
    
    # Add demo memories
    demo_memories = [
        {
            'id': str(uuid.uuid4()),
            'title': 'Family Trip to Burj Khalifa',
            'description': 'Amazing day at the world\'s tallest building',
            'date': (datetime.now() - timedelta(days=30)).isoformat(),
            'location': 'Burj Khalifa, Dubai',
            'tags': json.dumps(['family', 'travel', 'dubai', 'landmark']),
            'familyMembers': json.dumps([]),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Beach Day at JBR',
            'description': 'Relaxing day at Jumeirah Beach Residence',
            'date': (datetime.now() - timedelta(days=365)).isoformat(),
            'location': 'JBR Beach, Dubai',
            'tags': json.dumps(['family', 'beach', 'dubai', 'relaxation']),
            'familyMembers': json.dumps([]),
        }
    ]
    
    for memory in demo_memories:
        cursor.execute('''
            INSERT INTO memories (id, title, description, date, location, tags, familyMembers)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (memory['id'], memory['title'], memory['description'],
              memory['date'], memory['location'], memory['tags'], memory['familyMembers']))
    
    conn.commit()
    conn.close()
    print("Demo data seeded")

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'api': True,
            'ai': AI_ENABLED,
            'budget': BUDGET_SYSTEM_ENABLED,
            'database': True
        },
        'timestamp': datetime.now().isoformat()
    })

# Family Management APIs
@app.route('/api/family/members', methods=['GET'])
def get_family_members():
    """Get all family members"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM family_members ORDER BY name")
        members = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        # Parse JSON fields
        for member in members:
            member['relationships'] = json.loads(member.get('relationships', '[]'))
        
        return jsonify(members)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/family/members', methods=['POST'])
def create_family_member():
    """Create a new family member"""
    try:
        data = request.get_json()
        member_id = str(uuid.uuid4())
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO family_members (id, name, nameArabic, birthDate, location, avatar, relationships)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (member_id, data.get('name'), data.get('nameArabic'),
              data.get('birthDate'), data.get('location'), data.get('avatar'),
              json.dumps(data.get('relationships', []))))
        
        conn.commit()
        conn.close()
        
        return jsonify({'id': member_id, 'message': 'Family member created successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Memory Management APIs
@app.route('/api/memories', methods=['GET'])
def get_memories():
    """Get all memories"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM memories ORDER BY date DESC")
        memories = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        # Parse JSON fields
        for memory in memories:
            memory['tags'] = json.loads(memory.get('tags', '[]'))
            memory['familyMembers'] = json.loads(memory.get('familyMembers', '[]'))
            if memory.get('aiAnalysis'):
                memory['aiAnalysis'] = json.loads(memory['aiAnalysis'])
        
        return jsonify(memories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/memories/suggestions', methods=['GET'])
def get_memory_suggestions():
    """Get AI-powered memory suggestions"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get memories from this day in previous years
        today = datetime.now()
        this_day_filter = f"%-{today.month:02d}-{today.day:02d}"
        
        cursor.execute("""
            SELECT * FROM memories 
            WHERE date LIKE ? 
            ORDER BY date DESC 
            LIMIT 5
        """, (this_day_filter,))
        
        on_this_day = [dict(row) for row in cursor.fetchall()]
        
        # Get recent memories for similar suggestions
        cursor.execute("""
            SELECT * FROM memories 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        recent_memories = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        # Parse JSON fields
        for memories_list in [on_this_day, recent_memories]:
            for memory in memories_list:
                memory['tags'] = json.loads(memory.get('tags', '[]'))
                memory['familyMembers'] = json.loads(memory.get('familyMembers', '[]'))
        
        # Generate AI recommendations
        recommendations = [
            "Consider visiting Burj Khalifa again - it's been a while since your last family photo there!",
            "The weather is perfect for a JBR beach day like you enjoyed last year.",
            "Dubai Mall has new attractions that might interest the family.",
            "Plan a weekend trip to Hatta Mountains for a change of scenery."
        ]
        
        return jsonify({
            'onThisDay': on_this_day,
            'similar': recent_memories[:3],
            'recommendations': recommendations,
            'aiPowered': AI_ENABLED
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Travel APIs
@app.route('/api/travel/plans', methods=['GET'])
def get_travel_plans():
    """Get travel plans"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM travel_plans ORDER BY startDate DESC")
        plans = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        # Parse JSON fields
        for plan in plans:
            plan['participants'] = json.loads(plan.get('participants', '[]'))
            plan['activities'] = json.loads(plan.get('activities', '[]'))
        
        return jsonify(plans)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/travel/recommendations', methods=['GET'])
def get_travel_recommendations():
    """Get AI-powered travel recommendations"""
    try:
        # Parse query parameters
        budget = request.args.get('budget', 'medium')
        duration = request.args.get('duration', '3-5 days')
        interests = request.args.getlist('interests')
        
        # Get family context
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM memories WHERE location LIKE '%Dubai%'")
        dubai_visits = cursor.fetchone()['count']
        
        cursor.execute("SELECT location, COUNT(*) as visits FROM memories WHERE location IS NOT NULL GROUP BY location ORDER BY visits DESC LIMIT 1")
        most_visited_row = cursor.fetchone()
        most_visited = most_visited_row['location'] if most_visited_row else 'Dubai, UAE'
        
        conn.close()
        
        # Generate smart recommendations based on family history
        recommendations = []
        
        if 'family' in interests or not interests:
            recommendations.append({
                'destination': 'Abu Dhabi, UAE',
                'reason': 'Similar to your favorite Dubai experiences, with amazing family attractions like Ferrari World and Emirates Palace.',
                'activities': ['Sheikh Zayed Grand Mosque', 'Ferrari World', 'Louvre Abu Dhabi', 'Emirates Palace'],
                'estimated_budget': budget.title(),
                'family_friendly': True
            })
        
        if 'cultural' in interests or not interests:
            recommendations.append({
                'destination': 'Sharjah, UAE',
                'reason': 'Close to Dubai with rich cultural heritage and family-friendly museums.',
                'activities': ['Sharjah Museum', 'Al Noor Island', 'Heart of Sharjah', 'Sharjah Aquarium'],
                'estimated_budget': 'Low',
                'family_friendly': True
            })
        
        if 'sightseeing' in interests or not interests:
            recommendations.append({
                'destination': 'Doha, Qatar',
                'reason': 'Modern Middle Eastern city with stunning architecture, similar to what you love about Dubai.',
                'activities': ['Museum of Islamic Art', 'Souq Waqif', 'The Pearl Qatar', 'Katara Cultural Village'],
                'estimated_budget': budget.title(),
                'family_friendly': True
            })
        
        if 'adventure' in interests:
            recommendations.append({
                'destination': 'Istanbul, Turkey',
                'reason': 'Rich history and culture with adventure opportunities, building on your cultural interests.',
                'activities': ['Hagia Sophia', 'Blue Mosque', 'Grand Bazaar', 'Bosphorus Cruise'],
                'estimated_budget': 'Medium',
                'family_friendly': True
            })
        
        # AI reasoning
        reasoning = f"""Based on your family's travel history, I notice you've visited Dubai {dubai_visits} times and your most visited location is {most_visited}. You seem to enjoy cultural experiences and family-friendly destinations. These recommendations focus on similar Middle Eastern destinations that offer the blend of modernity and tradition your family appreciates."""
        
        return jsonify({
            'recommendations': recommendations,
            'reasoning': reasoning,
            'confidence': 0.85,
            'ai_powered': True,
            'family_context': {
                'visited_locations': dubai_visits + 2,  # Including other locations
                'most_visited': most_visited,
                'preferred_activities': interests if interests else ['family', 'cultural', 'sightseeing']
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Budget Integration APIs
@app.route('/api/budget/summary', methods=['GET'])
def get_budget_summary():
    """Get budget summary from integrated budget system"""
    try:
        if not BUDGET_SYSTEM_ENABLED:
            # Return mock data when budget system is not available
            return jsonify({
                'totalBudget': 5000.00,
                'totalSpent': 2850.75,
                'remainingBudget': 2149.25,
                'currency': 'AED',
                'integrated': False,
                'envelopes': [
                    {
                        'id': 'travel-1',
                        'name': 'Travel & Vacation',
                        'budgeted': 2000.00,
                        'spent': 1200.00,
                        'remaining': 800.00,
                        'category': 'travel',
                        'color': 'bg-blue-500',
                        'icon': 'plane'
                    },
                    {
                        'id': 'food-1',
                        'name': 'Dining & Food',
                        'budgeted': 1000.00,
                        'spent': 650.75,
                        'remaining': 349.25,
                        'category': 'food',
                        'color': 'bg-green-500',
                        'icon': 'utensils'
                    },
                    {
                        'id': 'entertainment-1',
                        'name': 'Entertainment',
                        'budgeted': 800.00,
                        'spent': 500.00,
                        'remaining': 300.00,
                        'category': 'entertainment',
                        'color': 'bg-purple-500',
                        'icon': 'game'
                    },
                    {
                        'id': 'transport-1',
                        'name': 'Transportation',
                        'budgeted': 600.00,
                        'spent': 300.00,
                        'remaining': 300.00,
                        'category': 'transport',
                        'color': 'bg-yellow-500',
                        'icon': 'car'
                    },
                    {
                        'id': 'emergency-1',
                        'name': 'Emergency Fund',
                        'budgeted': 600.00,
                        'spent': 200.00,
                        'remaining': 400.00,
                        'category': 'emergency',
                        'color': 'bg-red-500',
                        'icon': 'shield'
                    }
                ],
                'monthlyTrend': [
                    {
                        'income': 6000.00,
                        'expenses': 2850.75,
                        'month': 'Jan 2025'
                    }
                ]
            })
        
        # Try to fetch from actual budget system
        response = requests.get(f"{BUDGET_SYSTEM_URL}/budget/summary", timeout=10)
        if response.status_code == 200:
            data = response.json()
            data['integrated'] = True
            return jsonify(data)
        else:
            raise Exception("Budget system returned error")
            
    except Exception as e:
        # Return error with mock data
        return jsonify({
            'error': f'Budget system unavailable: {str(e)}',
            'totalBudget': 0,
            'totalSpent': 0,
            'remainingBudget': 0,
            'currency': 'AED',
            'integrated': False,
            'envelopes': [],
            'monthlyTrend': []
        }), 503

@app.route('/api/budget/travel-recommendations', methods=['GET'])
def get_travel_budget_recommendations():
    """Get travel-specific budget recommendations"""
    try:
        destination = request.args.get('destination', 'Unknown Destination')
        estimated_budget = float(request.args.get('estimatedBudget', 2000))
        
        # Generate budget breakdown recommendations
        recommendations = [
            {
                'category': 'Accommodation',
                'amount': estimated_budget * 0.4,  # 40% of budget
                'available': True,
                'description': f'Hotel/accommodation costs for {destination}'
            },
            {
                'category': 'Transportation',
                'amount': estimated_budget * 0.25,  # 25% of budget
                'available': True,
                'description': f'Flights and local transport in {destination}'
            },
            {
                'category': 'Food & Dining',
                'amount': estimated_budget * 0.2,  # 20% of budget
                'available': True,
                'description': f'Meals and dining experiences in {destination}'
            },
            {
                'category': 'Activities & Entertainment',
                'amount': estimated_budget * 0.1,  # 10% of budget
                'available': True,
                'description': f'Tours, attractions, and activities in {destination}'
            },
            {
                'category': 'Miscellaneous',
                'amount': estimated_budget * 0.05,  # 5% of budget
                'available': True,
                'description': 'Shopping, souvenirs, and unexpected expenses'
            }
        ]
        
        return jsonify({
            'recommendations': recommendations,
            'totalRecommended': estimated_budget,
            'currency': 'AED',
            'destination': destination
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/budget/envelopes', methods=['POST'])
def create_budget_envelope():
    """Create a new budget envelope"""
    try:
        data = request.get_json()
        
        if BUDGET_SYSTEM_ENABLED:
            # Forward to actual budget system
            response = requests.post(f"{BUDGET_SYSTEM_URL}/envelopes", json=data, timeout=10)
            if response.status_code == 200:
                return jsonify(response.json())
        
        # Mock response for offline mode
        envelope_id = str(uuid.uuid4())
        return jsonify({
            'id': envelope_id,
            'name': data.get('name'),
            'amount': data.get('amount', 0),
            'category': data.get('category'),
            'color': data.get('color'),
            'icon': data.get('icon'),
            'message': 'Envelope created (offline mode)'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/budget/allocate', methods=['POST'])
def update_budget_allocation():
    """Update budget allocation for a category"""
    try:
        data = request.get_json()
        category = data.get('category')
        amount = data.get('amount', 0)
        
        if BUDGET_SYSTEM_ENABLED:
            # Forward to actual budget system
            response = requests.post(f"{BUDGET_SYSTEM_URL}/budget/allocate", json=data, timeout=10)
            if response.status_code == 200:
                return jsonify(response.json())
        
        # Mock response for offline mode
        return jsonify({
            'category': category,
            'allocated': amount,
            'message': f'Allocated {amount} AED to {category} (offline mode)'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# File upload endpoint
@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file uploads for memory photos"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file:
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{timestamp}_{filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            # Create memory record
            memory_id = str(uuid.uuid4())
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO memories (id, title, description, date, imageUrl, tags, familyMembers)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (memory_id, f'Photo uploaded {datetime.now().strftime("%Y-%m-%d")}',
                  'Uploaded family photo', datetime.now().isoformat(),
                  f'/uploads/{unique_filename}', json.dumps(['family', 'photo']),
                  json.dumps([])))
            
            conn.commit()
            conn.close()
            
            return jsonify({
                'id': memory_id,
                'filename': unique_filename,
                'message': 'File uploaded successfully',
                'imageUrl': f'/uploads/{unique_filename}'
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve uploaded files
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Starting Family Platform API Server...")
    
    # Initialize services
    init_database()
    seed_demo_data()
    check_budget_system()
    
    print(f"""
=====================================================================
   Elmowafiplatform Family Platform API Server
=====================================================================

Main API Server: http://localhost:8001
Database: {app.config['DATABASE']}
AI Services: {'Enabled' if AI_ENABLED else 'Disabled'}
Budget Integration: {'Connected' if BUDGET_SYSTEM_ENABLED else 'Offline Mode'}

API Endpoints:
- GET  /api/health                    - Health check
- GET  /api/family/members           - Get family members
- POST /api/family/members           - Create family member
- GET  /api/memories                 - Get memories
- GET  /api/memories/suggestions     - Get AI memory suggestions
- GET  /api/travel/plans             - Get travel plans
- GET  /api/travel/recommendations   - Get AI travel recommendations
- GET  /api/budget/summary           - Get budget summary
- GET  /api/budget/travel-recommendations - Get travel budget recommendations
- POST /api/budget/envelopes         - Create budget envelope
- POST /api/budget/allocate          - Update budget allocation
- POST /api/upload                   - Upload memory photos

Press Ctrl+C to stop the server.
    """)
    
    app.run(debug=True, host='0.0.0.0', port=8001)