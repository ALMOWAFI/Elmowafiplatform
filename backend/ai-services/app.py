#!/usr/bin/env python
"""
AI Services for Family Memory Platform

This is the main Flask application for the family memory and travel platform.
It provides AI-powered services for:
- Family photo analysis and memory processing
- Travel planning and recommendations
- Cultural heritage preservation
- Memory timeline generation

The app integrates with the main React frontend to provide intelligent
family-focused features.
"""

import os
import json
import cv2
import numpy as np
from flask import Flask, request, render_template, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from datetime import datetime

# Import our family-focused AI services
from family_memory_processor import FamilyMemoryProcessor
from family_travel_ai import FamilyTravelAI

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULT_FOLDER'] = 'results'
app.config['FAMILY_DATA_FOLDER'] = 'family_data'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Create folders if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)
os.makedirs(app.config['FAMILY_DATA_FOLDER'], exist_ok=True)

# Initialize family AI services
memory_processor = FamilyMemoryProcessor()
travel_ai = FamilyTravelAI()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    return jsonify({
        "service": "Family Memory & Travel AI Platform",
        "version": "1.0.0",
        "endpoints": [
            "/api/memory/upload-photo",
            "/api/memory/timeline",
            "/api/travel/recommendations",
            "/api/travel/itinerary"
        ]
    })

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/results/<filename>')
def result_file(filename):
    return send_from_directory(app.config['RESULT_FOLDER'], filename)

# === FAMILY MEMORY ENDPOINTS ===

@app.route('/api/memory/upload-photo', methods=['POST'])
def upload_family_photo():
    """Upload and process a family photo for memory analysis."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Please upload JPG, JPEG, or PNG.'}), 400
    
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Get optional metadata from request
        metadata = {}
        if request.form.get('date'):
            metadata['date'] = request.form.get('date')
        if request.form.get('location'):
            metadata['location'] = request.form.get('location')
        if request.form.get('family_members'):
            metadata['family_members'] = request.form.get('family_members').split(',')
        
        # Process the family photo
        analysis_result = memory_processor.process_family_photo(file_path, metadata)
        
        return jsonify({
            'success': True,
            'message': 'Family photo processed successfully',
            'analysis': analysis_result,
            'image_url': f"/uploads/{filename}"
        })
        
    except Exception as e:
        return jsonify({'error': f'Error processing family photo: {str(e)}'}), 500

@app.route('/api/memory/timeline', methods=['GET'])
def get_family_timeline():
    """Get the family memory timeline."""
    try:
        # Get photos from uploads directory and create timeline
        photos_dir = app.config['UPLOAD_FOLDER']
        timeline = memory_processor.create_family_timeline(photos_dir)
        
        return jsonify({
            'success': True,
            'timeline': timeline,
            'total_memories': len(timeline)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error creating timeline: {str(e)}'}), 500

@app.route('/api/memory/suggestions', methods=['GET'])
def get_memory_suggestions():
    """Get smart memory suggestions ('On this day', similar memories)."""
    try:
        date = request.args.get('date')
        family_member = request.args.get('family_member')
        
        suggestions = memory_processor.get_memory_suggestions(date, family_member)
        
        return jsonify({
            'success': True,
            'suggestions': suggestions
        })
        
    except Exception as e:
        return jsonify({'error': f'Error getting suggestions: {str(e)}'}), 500

# === FAMILY TRAVEL ENDPOINTS ===

@app.route('/api/travel/recommendations', methods=['POST'])
def get_travel_recommendations():
    """Get personalized travel recommendations for the family."""
    try:
        data = request.get_json()
        
        travel_dates = data.get('travel_dates')
        budget = data.get('budget')
        family_size = data.get('family_size', 4)
        
        recommendations = travel_ai.get_destination_recommendations(
            travel_dates=travel_dates,
            budget=budget,
            family_size=family_size
        )
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        return jsonify({'error': f'Error getting recommendations: {str(e)}'}), 500

@app.route('/api/travel/itinerary', methods=['POST'])
def create_family_itinerary():
    """Create a detailed family itinerary for a destination."""
    try:
        data = request.get_json()
        
        destination = data.get('destination')
        duration_days = data.get('duration_days', 5)
        family_members = data.get('family_members', [])
        
        if not destination:
            return jsonify({'error': 'Destination is required'}), 400
        
        itinerary = travel_ai.plan_family_itinerary(
            destination=destination,
            duration_days=duration_days,
            family_members=family_members
        )
        
        return jsonify({
            'success': True,
            'itinerary': itinerary
        })
        
    except Exception as e:
        return jsonify({'error': f'Error creating itinerary: {str(e)}'}), 500

@app.route('/api/travel/cultural-insights/<destination>', methods=['GET'])
def get_cultural_insights(destination):
    """Get cultural insights and tips for family travel to destination."""
    try:
        insights = travel_ai.get_cultural_insights(destination)
        
        return jsonify({
            'success': True,
            'insights': insights
        })
        
    except Exception as e:
        return jsonify({'error': f'Error getting cultural insights: {str(e)}'}), 500

@app.route('/api/travel/patterns', methods=['GET'])
def analyze_travel_patterns():
    """Analyze family travel patterns for better recommendations."""
    try:
        analysis = travel_ai.analyze_family_travel_patterns()
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        return jsonify({'error': f'Error analyzing travel patterns: {str(e)}'}), 500

# === UTILITY ENDPOINTS ===

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'Family Memory & Travel AI',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'memory_processor': 'active',
            'travel_ai': 'active'
        }
    })

if __name__ == '__main__':
    print("Starting Family Memory & Travel AI Platform...")
    print("Available endpoints:")
    print("  - POST /api/memory/upload-photo")
    print("  - GET  /api/memory/timeline") 
    print("  - GET  /api/memory/suggestions")
    print("  - POST /api/travel/recommendations")
    print("  - POST /api/travel/itinerary")
    print("  - GET  /api/travel/cultural-insights/<destination>")
    print("  - GET  /api/travel/patterns")
    print("  - GET  /api/health")
    
    app.run(debug=True, port=5000)