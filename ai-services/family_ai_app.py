#!/usr/bin/env python3
"""
Family AI Services - Photo Analysis & Memory Processing
Clean AI server focused on family platform features ONLY
"""

import os
import cv2
import numpy as np
import requests
import json
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import face_recognition
from datetime import datetime
import sqlite3

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULT_FOLDER'] = 'results'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Create folders if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'family_ai'})

@app.route('/api/analyze-photo', methods=['POST'])
def analyze_family_photo():
    """Analyze family photos for faces, locations, and memories"""
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo uploaded'}), 400
    
    file = request.files['photo']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400
    
    try:
        # Save uploaded photo
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # Load and analyze image
        image = cv2.imread(filepath)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Family photo analysis
        analysis_result = {
            'filename': unique_filename,
            'faces_detected': 0,
            'family_members': [],
            'image_quality': 'good',
            'suggested_tags': [],
            'location_hints': [],
            'timestamp': timestamp
        }
        
        # Detect faces for family member recognition
        try:
            face_locations = face_recognition.face_locations(rgb_image)
            analysis_result['faces_detected'] = len(face_locations)
            
            # Add basic face analysis
            for i, face_location in enumerate(face_locations):
                analysis_result['family_members'].append({
                    'face_id': i + 1,
                    'location': face_location,
                    'confidence': 0.95  # Placeholder
                })
                
        except Exception as e:
            print(f"Face recognition error: {e}")
            analysis_result['faces_detected'] = 0
        
        # Suggest tags based on image analysis
        height, width = image.shape[:2]
        if width > height:
            analysis_result['suggested_tags'].append('landscape')
        
        # Basic image quality assessment
        blur_score = cv2.Laplacian(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
        if blur_score < 100:
            analysis_result['image_quality'] = 'blurry'
        elif blur_score > 500:
            analysis_result['image_quality'] = 'sharp'
            
        return jsonify(analysis_result), 200
        
    except Exception as e:
        return jsonify({'error': f'Photo analysis failed: {str(e)}'}), 500

@app.route('/api/travel-suggestions', methods=['POST'])
def travel_suggestions():
    """Generate AI travel suggestions for family trips"""
    data = request.get_json()
    family_size = data.get('family_size', 4)
    budget = data.get('budget', 'medium')
    interests = data.get('interests', [])
    
    # Simple travel suggestions based on family preferences
    suggestions = {
        'destinations': [
            {
                'name': 'Family Beach Resort',
                'type': 'beach',
                'family_friendly': True,
                'budget_level': budget,
                'activities': ['swimming', 'beach games', 'family dining']
            },
            {
                'name': 'Mountain Family Lodge',
                'type': 'mountain',
                'family_friendly': True,
                'budget_level': budget,
                'activities': ['hiking', 'nature walks', 'family picnics']
            }
        ],
        'budget_estimate': f"${1000 * family_size} - ${2000 * family_size}",
        'family_size': family_size
    }
    
    return jsonify(suggestions), 200

@app.route('/api/memory-suggestions', methods=['POST'])
def memory_suggestions():
    """Generate memory suggestions based on family data"""
    data = request.get_json()
    current_date = data.get('date', datetime.now().isoformat())
    
    # Simple memory suggestions
    suggestions = {
        'on_this_day': [],
        'similar_memories': [],
        'family_highlights': [
            'Family vacation photos from last summer',
            'Birthday celebrations this month',
            'Recent family gatherings'
        ],
        'suggested_albums': [
            'Summer 2024 Adventures',
            'Family Birthdays',
            'Holiday Celebrations'
        ]
    }
    
    return jsonify(suggestions), 200

if __name__ == '__main__':
    print("Starting Family AI Services...")
    print("Features: Photo analysis, travel suggestions, memory processing")
    print("Port: 5001")
    app.run(host='0.0.0.0', port=5001, debug=True)