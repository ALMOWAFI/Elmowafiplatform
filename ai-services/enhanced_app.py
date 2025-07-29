import os
import cv2
import numpy as np
import requests
import json
from flask import Flask, request, render_template, jsonify, send_from_directory, url_for
from werkzeug.utils import secure_filename
from math_analyzer.improved_error_localization import MathErrorDetector

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULT_FOLDER'] = 'results'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'pdf'}

# Create folders if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)

# vLLM API URL (use environment variable or default to localhost)
VLLM_API_URL = os.environ.get('VLLM_API_URL', 'http://localhost:8000')
AVAILABLE_TEACHING_STYLES = [
    'detailed', 
    'encouraging', 
    'historical_mathematician',
    'quantum_professor', 
    'renaissance_artist'
]

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    return render_template('index.html', teaching_styles=AVAILABLE_TEACHING_STYLES)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/results/<filename>')
def result_file(filename):
    return send_from_directory(app.config['RESULT_FOLDER'], filename)

@app.route('/api/teaching-styles')
def teaching_styles():
    """Return the available teaching styles based on vLLM models"""
    try:
        response = requests.get(f"{VLLM_API_URL}/models")
        if response.status_code == 200:
            models = response.json().get('models', [])
            # Filter for teaching style models
            teaching_styles = [model for model in models 
                              if model in AVAILABLE_TEACHING_STYLES]
            return jsonify({'styles': teaching_styles})
        return jsonify({'styles': AVAILABLE_TEACHING_STYLES})
    except Exception as e:
        print(f"Error fetching models: {e}")
        return jsonify({'styles': AVAILABLE_TEACHING_STYLES})

@app.route('/detect', methods=['POST'])
def detect_errors():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'})
    
    # Save uploaded file
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    # Get student work and correct solution from form
    student_work = request.form.get('student_work', '')
    correct_solution = request.form.get('correct_solution', '')
    teaching_style = request.form.get('teaching_style', 'detailed')
    
    # Read image
    image = cv2.imread(file_path)
    if image is None:
        return jsonify({'error': 'Could not read image'})
    
    # Process the image
    try:
        # Create error detector
        detector = MathErrorDetector()
        
        # Detect errors
        result = detector.detect_errors(student_work, correct_solution, image)
        
        # Save the marked image
        result_filename = f"{os.path.splitext(filename)[0]}_marked.jpg"
        result_path = os.path.join(app.config['RESULT_FOLDER'], result_filename)
        
        if result.marked_image is not None:
            cv2.imwrite(result_path, result.marked_image)
        
        # Format errors for display
        errors = []
        for error in result.errors:
            errors.append({
                'line_number': error.line_number,
                'error_text': error.error_text,
                'error_type': error.error_type,
                'correction': error.correction,
                'explanation': error.explanation,
                'position': {
                    'top_left_x': error.top_left_x,
                    'top_left_y': error.top_left_y,
                    'bottom_right_x': error.bottom_right_x,
                    'bottom_right_y': error.bottom_right_y
                }
            })
        
        # Generate vLLM feedback with selected teaching style
        expert_feedback = generate_vllm_feedback(student_work, result.errors, teaching_style)
        
        # Generate practice sheet based on errors
        practice_sheet = generate_practice_sheet(result.errors)
        
        return jsonify({
            'success': True,
            'original_image': f"/uploads/{filename}",
            'marked_image': f"/results/{result_filename}",
            'errors': errors,
            'error_count': len(errors),
            'expert_feedback': expert_feedback,
            'practice_sheet': practice_sheet,
            'teaching_style': teaching_style
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': f'Error processing image: {str(e)}'})

def generate_vllm_feedback(student_work, errors, style="detailed"):
    """Generate pedagogical feedback based on detected errors using vLLM"""
    if not errors:
        return "Great job! All your answers are correct."
    
    # Create prompt for vLLM
    error_descriptions = []
    for i, error in enumerate(errors):
        error_descriptions.append(
            f"Error {i+1}: {error.error_type} in '{error.error_text}'. "
            f"Correct form: {error.correction}. "
            f"Explanation: {error.explanation}"
        )
    
    error_text = "\n".join(error_descriptions)
    
    prompt = f"""
As a {style} math teacher, provide helpful feedback for a student who made the following errors:

Student's work:
{student_work}

Detected errors:
{error_text}

Please provide tailored feedback to help the student understand their mistakes and improve.
"""
    
    try:
        # Call vLLM API
        response = requests.post(
            f"{VLLM_API_URL}/generate",
            json={
                "prompt": prompt,
                "model": style,  # Use teaching style as model name
                "max_tokens": 512,
                "temperature": 0.2
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("text", "").strip()
        else:
            print(f"vLLM API error: {response.status_code} - {response.text}")
            # Fallback to basic feedback
            return generate_basic_feedback(student_work, errors)
    except Exception as e:
        print(f"Error calling vLLM API: {e}")
        # Fallback to basic feedback
        return generate_basic_feedback(student_work, errors)

def generate_basic_feedback(student_work, errors):
    """Fallback feedback generator when vLLM is not available"""
    if not errors:
        return "Great job! All your answers are correct."
    
    lines = student_work.strip().split('\n')
    
    # Group errors by line
    errors_by_line = {}
    for error in errors:
        line_idx = error.line_number - 1  # Convert to 0-indexed
        if 0 <= line_idx < len(lines):
            if line_idx not in errors_by_line:
                errors_by_line[line_idx] = []
            errors_by_line[line_idx].append(error)
    
    feedback = ["I noticed some issues in your work:"]
    
    # Generate feedback for each line with errors
    for line_idx, line_errors in sorted(errors_by_line.items()):
        line = lines[line_idx]
        feedback.append(f"\nProblem {line_idx + 1}: {line}")
        
        for error in line_errors:
            feedback.append(f"• {error.explanation} The correct form is {error.correction}.")
                
    # Add overall recommendation
    feedback.append("\nRemember to carefully check your calculations and apply mathematical rules correctly.")
    
    return "\n".join(feedback)

def generate_practice_sheet(errors):
    """Generate practice problems based on detected error types"""
    if not errors:
        return "No errors detected. Keep up the good work!"
    
    # Get unique error types
    error_types = set()
    for error in errors:
        error_types.add(error.error_type.lower())
    
    practice_problems = ["# Practice Sheet\n## Based on your specific error patterns\n"]
    
    if "arithmetic" in error_types:
        practice_problems.append("""
### Arithmetic Practice
1. Evaluate: 3/4 + 2/3
2. Simplify: (7 × 9) ÷ 3 - 4^2
3. Calculate: 12.5 × 0.8
""")
    
    if "sign" in error_types:
        practice_problems.append("""
### Sign Handling Practice
1. Solve: 3x - 7 = -10
2. Simplify: -2(3x - 4) + 5
3. Solve: -5x > 15
""")
    
    if "exponent" in error_types:
        practice_problems.append("""
### Exponent Rules Practice
1. Simplify: (x^2)^3 × x^4
2. Expand: (2a)^3
3. Solve: 2^x = 32
""")
        
    if "distribution" in error_types:
        practice_problems.append("""
### Distribution Practice
1. Expand: 3(x + 2y - 5)
2. Expand and simplify: (x + 5)(x - 2)
3. Factor: 3x^2 - 12
""")
    
    if "factoring" in error_types:
        practice_problems.append("""
### Factoring Practice
1. Factor completely: x^2 - 9
2. Factor: 6x^2 + 13x - 5
3. Solve by factoring: x^2 - 7x + 12 = 0
""")
    
    # Create a general practice section for any other error types
    practice_problems.append("""
### General Review Practice
1. Solve the equation: 2x/3 - 5 = x/6 + 2
2. Simplify the expression: (3x^2 - 5x + 2) - (x^2 - 3x - 7)
3. Find the domain of f(x) = √(x + 3)
""")
    
    return "\n".join(practice_problems)

@app.route('/health')
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({'status': 'ok'})

@app.route('/api/models')
def get_models():
    """Get available models from vLLM server"""
    try:
        response = requests.get(f"{VLLM_API_URL}/models")
        if response.status_code == 200:
            return response.json()
        return jsonify({'error': f"Error fetching models: {response.status_code}"})
    except Exception as e:
        return jsonify({'error': f"Error connecting to vLLM server: {str(e)}"})

@app.route('/analyze-family-photo', methods=['POST'])
def analyze_family_photo():
    """Analyze uploaded family photo using computer vision and AI"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'})
    
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Get context from form
        context = request.form.get('context', '')
        
        # Read image
        image = cv2.imread(file_path)
        if image is None:
            return jsonify({'error': 'Could not read image'})
        
        # Basic image analysis
        height, width, channels = image.shape
        
        # Placeholder for advanced analysis (facial recognition, scene detection, etc.)
        analysis_result = {
            'image_info': {
                'width': int(width),
                'height': int(height),
                'channels': int(channels),
                'filename': filename
            },
            'detected_faces': [],  # TODO: Implement face detection
            'scene_analysis': 'Family gathering in indoor setting',  # TODO: Implement scene analysis
            'suggested_tags': ['family', 'memory', 'indoor'],
            'context': context,
            'timestamp': json.dumps(None, default=str)
        }
        
        return jsonify({
            'success': True,
            'analysis': analysis_result,
            'uploaded_image': f"/uploads/{filename}"
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': f'Error analyzing photo: {str(e)}'})

@app.route('/api/memory-suggestions', methods=['POST'])
def get_memory_suggestions():
    """Generate AI-powered memory suggestions for family"""
    try:
        data = request.get_json()
        family_context = data.get('familyContext', {})
        date = data.get('date')
        suggestion_type = data.get('type', 'general')
        
        # Mock AI-generated memory suggestions based on family context
        suggestions = []
        
        if family_context and 'member' in family_context:
            member = family_context['member']
            suggestions.append({
                'type': 'birthday_reminder',
                'title': f"Birthday Memory for {member.get('name', 'Family Member')}",
                'description': f"Remember when {member.get('name')} celebrated their birthday last year? Consider planning something special this year!",
                'relevance_score': 0.9,
                'suggested_actions': ['Plan celebration', 'Review past birthday photos', 'Create photo album']
            })
        
        suggestions.extend([
            {
                'type': 'seasonal_memory',
                'title': 'Seasonal Family Activities',
                'description': 'This time of year is perfect for family outings and creating new memories together.',
                'relevance_score': 0.7,
                'suggested_actions': ['Plan outdoor activity', 'Visit local attractions', 'Take family photos']
            },
            {
                'type': 'travel_memory',
                'title': 'Past Travel Adventures',
                'description': 'Remember your last family trip? Consider planning another adventure to create more wonderful memories.',
                'relevance_score': 0.8,
                'suggested_actions': ['Browse travel photos', 'Plan new trip', 'Share travel stories']
            }
        ])
        
        return jsonify({
            'success': True,
            'suggestions': suggestions,
            'context': family_context
        })
        
    except Exception as e:
        return jsonify({'error': f'Error generating memory suggestions: {str(e)}'})

@app.route('/api/travel-recommendations', methods=['POST'])
def get_travel_recommendations():
    """Generate AI-powered travel recommendations for family"""
    try:
        data = request.get_json()
        destination = data.get('destination')
        budget = data.get('budget')
        duration = data.get('duration')
        family_context = data.get('familyContext', [])
        preferences = data.get('preferences', {})
        
        # Mock AI-generated travel recommendations
        recommendations = {
            'destination_analysis': {
                'suitability_score': 0.85,
                'family_friendly_rating': 0.9,
                'cultural_significance': 'High - rich historical heritage perfect for family education'
            },
            'itinerary_suggestions': [
                {
                    'day': 1,
                    'activities': [
                        'Arrival and hotel check-in',
                        'Family-friendly local restaurant for dinner',
                        'Evening walk in safe tourist area'
                    ],
                    'budget_estimate': budget * 0.15 if budget else 200
                },
                {
                    'day': 2,
                    'activities': [
                        'Historical museum visit',
                        'Traditional market exploration',
                        'Cultural performance or local entertainment'
                    ],
                    'budget_estimate': budget * 0.25 if budget else 300
                }
            ],
            'family_considerations': {
                'child_friendly_venues': True,
                'elderly_accessible': True,
                'cultural_dietary_options': True,
                'language_support': 'Arabic and English available'
            },
            'budget_breakdown': {
                'accommodation': budget * 0.4 if budget else 800,
                'activities': budget * 0.3 if budget else 600,
                'meals': budget * 0.2 if budget else 400,
                'transportation': budget * 0.1 if budget else 200
            },
            'cultural_tips': [
                'Respect local customs and dress codes',
                'Learn basic greetings in local language',
                'Try traditional family-style dining experiences'
            ]
        }
        
        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'family_context': family_context
        })
        
    except Exception as e:
        return jsonify({'error': f'Error generating travel recommendations: {str(e)}'})

@app.route('/api/travel-analysis', methods=['POST'])
def comprehensive_travel_analysis():
    """Advanced AI-powered travel destination analysis"""
    try:
        data = request.get_json()
        destination = data.get('destination')
        duration = data.get('duration', 7)
        budget = data.get('budget', 2000)
        family_context = data.get('familyContext', [])
        past_experiences = data.get('pastExperiences', [])
        preferences = data.get('preferences', {})
        cultural_background = data.get('culturalBackground', '')
        
        # Advanced AI analysis combining multiple factors
        analysis = {
            'destinationInsights': {
                'overview': f"{destination} offers a perfect blend of culture, adventure, and family-friendly experiences.",
                'culturalSignificance': f"Rich historical heritage with strong connections to {cultural_background} culture.",
                'familySuitability': 0.85,
                'costEffectiveness': calculateCostEffectiveness(budget, duration, destination),
                'seasonalFactors': {
                    'bestMonths': ['March', 'April', 'October', 'November'],
                    'weatherPattern': 'Pleasant temperatures with minimal rainfall',
                    'crowdLevels': 'Moderate to high during peak season'
                },
                'accessibility': {
                    'childFriendly': True,
                    'elderlyFriendly': True,
                    'wheelchairAccessible': True,
                    'languageBarrier': 'Low - English widely spoken'
                }
            },
            'activities': generateActivityRecommendations(destination, family_context, preferences),
            'accommodations': generateAccommodationSuggestions(destination, len(family_context), budget),
            'dining': generateDiningRecommendations(destination, cultural_background, family_context),
            'transportation': analyzeTransportationOptions(destination, budget),
            'budgetBreakdown': {
                'accommodation': budget * 0.40,
                'activities': budget * 0.25,
                'food': budget * 0.20,
                'transportation': budget * 0.10,
                'miscellaneous': budget * 0.05,
                'recommendations': [
                    'Book accommodation early for better rates',
                    'Consider package deals for activities',
                    'Try local street food for authentic experience'
                ]
            },
            'culturalTips': generateCulturalTips(destination, cultural_background),
            'safetyInformation': {
                'overall': 'Very Safe',
                'specificConcerns': [],
                'emergencyContacts': generateEmergencyContacts(destination),
                'healthPrecautions': ['Stay hydrated', 'Use sunscreen', 'Carry hand sanitizer']
            },
            'packingRecommendations': generatePackingList(destination, duration, family_context),
            'aiConfidence': 0.92,
            'lastUpdated': json.dumps(None, default=str)
        }
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'processingTime': '2.3 seconds',
            'recommendationCount': len(analysis['activities'])
        })
        
    except Exception as e:
        return jsonify({'error': f'Error performing travel analysis: {str(e)}'})

@app.route('/api/generate-itinerary', methods=['POST'])
def generate_smart_itinerary():
    """Generate AI-optimized travel itinerary"""
    try:
        data = request.get_json()
        destination = data.get('destination', {})
        duration = data.get('duration', 7)
        budget = data.get('budget', 2000)
        participants = data.get('participants', 2)
        preferences = data.get('preferences', [])
        
        # Generate day-by-day itinerary
        itinerary = []
        daily_budget = budget / duration
        
        for day in range(1, duration + 1):
            day_theme = getDayTheme(day, duration)
            activities = generateDayActivities(destination, day, day_theme, daily_budget, preferences)
            
            itinerary.append({
                'day': day,
                'date': None,  # Will be set by frontend
                'theme': day_theme,
                'activities': activities,
                'meals': generateMealSuggestions(destination, daily_budget * 0.3),
                'estimatedBudget': daily_budget,
                'walkingDistance': calculateWalkingDistance(activities),
                'highlights': getTopHighlights(activities)
            })
        
        recommendations = {
            'destinations': [
                {
                    'name': destination.get('name', 'Main Destination'),
                    'reasoning': 'Perfect blend of culture and family activities',
                    'score': 0.9,
                    'pros': ['Family-friendly', 'Rich culture', 'Great food'],
                    'cons': ['Can be crowded', 'Higher costs in tourist areas']
                }
            ],
            'activities': generateTopActivityRecommendations(destination),
            'restaurants': generateRestaurantRecommendations(destination),
            'accommodations': generateAccommodationRecommendations(destination, participants, budget),
            'transportation': getTransportationAdvice(destination),
            'culturalTips': [
                'Respect local customs and dress codes',
                'Learn basic greetings in the local language',
                'Try traditional dishes and local markets'
            ],
            'weatherInsights': {
                'general': 'Pleasant weather expected for your travel dates',
                'packing': ['Light layers', 'Comfortable walking shoes', 'Sun protection'],
                'activities': ['Perfect for outdoor sightseeing', 'Great photo opportunities']
            },
            'budgetOptimization': {
                'suggestions': [
                    'Book combination tickets for multiple attractions',
                    'Eat at local restaurants instead of tourist spots',
                    'Use public transportation when possible'
                ],
                'potentialSavings': budget * 0.15,
                'splurgeWorthyItems': ['Sunset dinner cruise', 'Private cultural tour']
            }
        }
        
        return jsonify({
            'success': True,
            'itinerary': itinerary,
            'recommendations': recommendations,
            'metadata': {
                'generatedAt': json.dumps(None, default=str),
                'totalActivities': sum(len(day['activities']) for day in itinerary),
                'averageDailyBudget': daily_budget,
                'culturalScore': 0.85,
                'familyFriendlyScore': 0.90
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Error generating itinerary: {str(e)}'})

@app.route('/api/optimize-trip', methods=['POST'])
def optimize_trip():
    """AI-powered trip optimization"""
    try:
        data = request.get_json()
        trip = data.get('trip', {})
        optimization_type = data.get('optimizationType', 'budget')
        constraints = data.get('constraints', {})
        
        optimizations = {}
        
        if optimization_type == 'budget':
            optimizations = optimizeForBudget(trip, constraints)
        elif optimization_type == 'time':
            optimizations = optimizeForTime(trip, constraints)
        elif optimization_type == 'family-friendly':
            optimizations = optimizeForFamily(trip, constraints)
        elif optimization_type == 'cultural':
            optimizations = optimizeForCulture(trip, constraints)
        else:
            optimizations = performGeneralOptimization(trip, constraints)
        
        return jsonify({
            'success': True,
            'optimizations': optimizations,
            'originalScore': calculateTripScore(trip),
            'optimizedScore': calculateTripScore(optimizations.get('optimizedTrip', trip)),
            'improvementAreas': identifyImprovementAreas(trip),
            'confidence': 0.88
        })
        
    except Exception as e:
        return jsonify({'error': f'Error optimizing trip: {str(e)}'})

# Helper functions for travel AI

def calculateCostEffectiveness(budget, duration, destination):
    # Simplified cost analysis
    daily_budget = budget / duration
    if daily_budget > 200:
        return 'High-end experience with premium options'
    elif daily_budget > 100:
        return 'Comfortable mid-range experience'
    else:
        return 'Budget-friendly with great value options'

def generateActivityRecommendations(destination, family_context, preferences):
    activities = [
        {
            'title': f'Cultural Heritage Tour of {destination}',
            'description': 'Explore the rich history and traditions',
            'duration': 180,
            'cost': 45,
            'category': 'cultural',
            'familyFriendly': True,
            'aiRecommended': True,
            'reasons': ['Perfect for family learning', 'Great photo opportunities']
        },
        {
            'title': 'Traditional Market Experience',
            'description': 'Immerse in local life and cuisine',
            'duration': 120,
            'cost': 20,
            'category': 'cultural',
            'familyFriendly': True,
            'aiRecommended': True,
            'reasons': ['Authentic experience', 'Budget-friendly', 'Interactive']
        }
    ]
    return activities

def generateAccommodationSuggestions(destination, family_size, budget):
    accommodation_budget = budget * 0.4
    return [
        {
            'name': f'Family Resort {destination}',
            'type': 'resort',
            'priceRange': '$$',
            'amenities': ['Family rooms', 'Pool', 'Kids club', 'Restaurant'],
            'familyScore': 0.95,
            'estimatedCost': accommodation_budget * 0.7
        }
    ]

def generateDiningRecommendations(destination, cultural_background, family_context):
    return [
        {
            'name': 'Traditional Family Restaurant',
            'cuisine': 'Local',
            'priceRange': '$$',
            'specialties': ['Local dishes', 'Family platters'],
            'familyFriendly': True,
            'halalOptions': 'arabic' in cultural_background.lower()
        }
    ]

def analyzeTransportationOptions(destination, budget):
    return [
        {
            'type': 'Private Car with Driver',
            'pros': ['Comfortable', 'Flexible schedule', 'Family-friendly'],
            'cons': ['Higher cost', 'Traffic concerns'],
            'estimatedCost': budget * 0.15
        }
    ]

def generateCulturalTips(destination, cultural_background):
    return [
        'Dress modestly when visiting religious sites',
        'Learn basic local greetings',
        'Respect prayer times and local customs',
        'Try traditional cuisine with family-friendly options'
    ]

def generateEmergencyContacts(destination):
    return {
        'police': '999',
        'medical': '998',
        'tourist_helpline': '+1-800-HELP',
        'embassy': 'Contact local embassy if needed'
    }

def generatePackingList(destination, duration, family_context):
    base_items = [
        'Comfortable walking shoes',
        'Light layers for varying temperatures',
        'Sun protection (hat, sunscreen)',
        'Portable chargers and adapters',
        'First aid kit',
        'Travel documents and copies'
    ]
    
    if any(member.get('age', 100) < 18 for member in family_context):
        base_items.extend(['Snacks', 'Entertainment for kids', 'Extra clothing'])
    
    return base_items

def getDayTheme(day, total_duration):
    if day == 1:
        return 'Arrival & City Orientation'
    elif day == total_duration:
        return 'Final Exploration & Departure'
    elif day <= total_duration // 2:
        return f'Cultural Discovery Day {day-1}'
    else:
        return f'Adventure & Experience Day {day-1}'

def generateDayActivities(destination, day, theme, daily_budget, preferences):
    return [
        {
            'time': '09:00',
            'title': f'Morning {theme.split()[0]} Activity',
            'description': f'Start your day with {theme.lower()}',
            'location': {'name': f'{destination.get("name", "Destination")} Center'},
            'duration': 120,
            'cost': {'estimated': daily_budget * 0.3},
            'category': 'sightseeing',
            'suitability': {'children': True, 'elderly': True, 'accessibility': True},
            'aiGenerated': True
        }
    ]

def generateMealSuggestions(destination, meal_budget):
    return {
        'breakfast': {
            'restaurant': 'Local Breakfast Spot',
            'cost': meal_budget * 0.25,
            'notes': 'Traditional breakfast with family options'
        },
        'lunch': {
            'restaurant': 'Family Restaurant',
            'cost': meal_budget * 0.35,
            'notes': 'Local cuisine in family-friendly setting'
        },
        'dinner': {
            'restaurant': 'Cultural Dining Experience',
            'cost': meal_budget * 0.40,
            'notes': 'Traditional dinner with entertainment'
        }
    }

def calculateWalkingDistance(activities):
    return f"{len(activities) * 0.5:.1f} km"

def getTopHighlights(activities):
    return [activity['title'] for activity in activities[:2]]

def generateTopActivityRecommendations(destination):
    return [
        {
            'title': 'Must-Visit Cultural Site',
            'description': 'Top-rated family attraction',
            'location': destination.get('name', 'Main City'),
            'cost': 25,
            'duration': 180,
            'suitabilityScore': 0.9,
            'reasons': ['Highly rated', 'Educational', 'Photo opportunities']
        }
    ]

def generateRestaurantRecommendations(destination):
    return [
        {
            'name': 'Top Family Restaurant',
            'cuisine': 'Local',
            'priceRange': '$$',
            'rating': 4.5,
            'specialties': ['Traditional dishes', 'Kids menu'],
            'familyFriendly': True
        }
    ]

def generateAccommodationRecommendations(destination, participants, budget):
    return [
        {
            'name': 'Recommended Family Hotel',
            'type': 'hotel',
            'priceRange': '$$',
            'amenities': ['Family rooms', 'Pool', 'Restaurant', 'WiFi'],
            'familyScore': 0.9
        }
    ]

def getTransportationAdvice(destination):
    return [
        {
            'type': 'recommended',
            'pros': ['Convenient', 'Family-friendly', 'Cost-effective'],
            'cons': ['May require advance booking'],
            'estimatedCost': 150
        }
    ]

def optimizeForBudget(trip, constraints):
    return {
        'optimizedTrip': trip,
        'budgetSavings': trip.get('budget', {}).get('total', 2000) * 0.15,
        'recommendations': [
            'Switch to budget accommodations',
            'Use public transportation',
            'Eat at local restaurants',
            'Book activities in advance for discounts'
        ],
        'alternativeOptions': []
    }

def optimizeForTime(trip, constraints):
    return {
        'optimizedTrip': trip,
        'timeSavings': '2-3 hours per day',
        'recommendations': [
            'Book skip-the-line tickets',
            'Use efficient transportation',
            'Group nearby activities',
            'Pre-plan restaurant reservations'
        ]
    }

def optimizeForFamily(trip, constraints):
    return {
        'optimizedTrip': trip,
        'familyScore': 0.95,
        'recommendations': [
            'Add more child-friendly activities',
            'Include rest breaks',
            'Choose family-oriented restaurants',
            'Book accommodations with family amenities'
        ]
    }

def optimizeForCulture(trip, constraints):
    return {
        'optimizedTrip': trip,
        'culturalScore': 0.9,
        'recommendations': [
            'Add cultural heritage sites',
            'Include traditional experiences',
            'Book cultural performances',
            'Try authentic local cuisine'
        ]
    }

def performGeneralOptimization(trip, constraints):
    return {
        'optimizedTrip': trip,
        'overallScore': 0.88,
        'recommendations': [
            'Balance activities and rest',
            'Optimize transportation routes',
            'Mix cultural and recreational activities',
            'Consider weather and seasons'
        ]
    }

def calculateTripScore(trip):
    return 0.75  # Simplified scoring

def identifyImprovementAreas(trip):
    return [
        'Budget allocation optimization',
        'Activity variety enhancement',
        'Transportation efficiency',
        'Cultural experience depth'
    ]

if __name__ == '__main__':
    # Check vLLM server availability
    try:
        response = requests.get(f"{VLLM_API_URL}/health", timeout=2)
        if response.status_code == 200:
            print(f"Successfully connected to vLLM server at {VLLM_API_URL}")
        else:
            print(f"Warning: vLLM server health check failed with status {response.status_code}")
    except Exception as e:
        print(f"Warning: Could not connect to vLLM server: {e}")
        print("Application will use fallback feedback generation.")
        
    # Start the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
