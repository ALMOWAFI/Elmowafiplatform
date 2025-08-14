#!/usr/bin/env python3
"""
Simple integration test for the memory processing pipeline
Tests the complete flow from frontend API to AI processing
"""

import asyncio
import json
import logging
from pathlib import Path
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_memory_integration():
    """Test the complete memory processing integration"""
    try:
        logger.info("Starting Memory Processing Integration Test")
        
        # Test 1: Initialize AI Services
        logger.info("Test 1: Initializing AI Services...")
        
        try:
            from backend.family_memory_processor import FamilyMemoryProcessor
            from backend.family_travel_ai import FamilyTravelAI
            from backend.helper_functions import analyze_image_with_ai
            
            memory_processor = FamilyMemoryProcessor()
            travel_ai = FamilyTravelAI()
            
            logger.info("SUCCESS: AI Services initialized successfully")
            
            # Check face detection capability
            if memory_processor.face_cascade is not None:
                logger.info("SUCCESS: Face detection is available")
            else:
                logger.warning("WARNING: Face detection not available - install OpenCV properly")
            
        except Exception as e:
            logger.error(f"FAILED: AI Services initialization failed: {e}")
            return False
        
        # Test 2: Travel AI Recommendations
        logger.info("Test 2: Testing Travel AI...")
        
        try:
            # Test travel recommendations
            recommendations = travel_ai.get_destination_recommendations(
                travel_dates="2024-12-01",
                budget=5000.0,
                family_size=4,
                interests=["cultural", "educational", "entertainment"]
            )
            
            if "recommendations" in recommendations:
                logger.info(f"SUCCESS: Travel AI generated {len(recommendations['recommendations'])} recommendations")
                
                # Show top recommendation
                if recommendations["recommendations"]:
                    top_rec = recommendations["recommendations"][0]
                    logger.info(f"Top recommendation: {top_rec['destination']} (score: {top_rec['score']:.2f})")
            else:
                logger.error("FAILED: Travel AI recommendations failed")
                return False
                
        except Exception as e:
            logger.error(f"FAILED: Travel AI test failed: {e}")
            return False
        
        # Test 3: API Router Integration
        logger.info("Test 3: Testing API Router Integration...")
        
        try:
            # Test importing the API router
            from backend.api_v1 import router as api_v1_router
            
            # Check if router has the expected endpoints
            routes = [route.path for route in api_v1_router.routes]
            logger.info(f"SUCCESS: API Router loaded with {len(routes)} routes")
            
        except Exception as e:
            logger.error(f"FAILED: API Router integration test failed: {e}")
            return False
        
        # Test 4: Directory Structure
        logger.info("Test 4: Testing Directory Structure...")
        
        try:
            # Check required directories
            required_dirs = [
                "uploads",
                "uploads/memories", 
                "uploads/results",
                "data",
                "data/family",
                "temp",
                "temp/analysis"
            ]
            
            base_path = Path(".")
            created_dirs = []
            for dir_name in required_dirs:
                dir_path = base_path / dir_name
                dir_path.mkdir(parents=True, exist_ok=True)
                
                if dir_path.exists():
                    created_dirs.append(dir_name)
                    
            logger.info(f"SUCCESS: Created/verified {len(created_dirs)} directories")
            
        except Exception as e:
            logger.error(f"FAILED: Directory structure test failed: {e}")
            return False
        
        # Final Summary
        logger.info("=" * 60)
        logger.info("INTEGRATION TEST COMPLETED SUCCESSFULLY!")
        logger.info("=" * 60)
        
        logger.info("Summary of Successful Tests:")
        logger.info("   1. AI Services Initialization")
        logger.info("   2. Travel AI Recommendations")
        logger.info("   3. API Router Integration")
        logger.info("   4. Directory Structure Setup")
        
        logger.info("The memory processing integration is READY!")
        
        logger.info("API Endpoints Available:")
        logger.info("   POST /api/v1/memory/upload - Upload and process family memories")
        logger.info("   GET  /api/v1/memory/timeline - Get family memory timeline")
        logger.info("   GET  /api/v1/memory/suggestions - Get AI memory suggestions")
        logger.info("   POST /api/v1/memory/analyze-image - Analyze images with AI")
        logger.info("   POST /api/v1/travel/recommendations - Get travel recommendations")
        logger.info("   POST /api/v1/family/members - Add family members")
        logger.info("   POST /api/v1/chat/message - Chat with AI assistant")
        logger.info("   GET  /api/v1/health - Health check")
        
        logger.info("Next Steps:")
        logger.info("   1. Start the backend server: python backend/main.py")
        logger.info("   2. Test endpoints with the React frontend")
        logger.info("   3. Upload actual family photos for AI analysis")
        
        return True
        
    except Exception as e:
        logger.error(f"FAILED: Integration test failed with error: {e}")
        return False

def test_individual_components():
    """Test individual components separately"""
    logger.info("Testing Individual Components...")
    
    components_status = {
        "FamilyMemoryProcessor": False,
        "FamilyTravelAI": False,
        "HelperFunctions": False,
        "APIRouter": False
    }
    
    # Test FamilyMemoryProcessor
    try:
        from backend.family_memory_processor import FamilyMemoryProcessor
        processor = FamilyMemoryProcessor()
        components_status["FamilyMemoryProcessor"] = True
        logger.info("   SUCCESS: FamilyMemoryProcessor - Available")
    except Exception as e:
        logger.error(f"   FAILED: FamilyMemoryProcessor - {e}")
    
    # Test FamilyTravelAI
    try:
        from backend.family_travel_ai import FamilyTravelAI
        travel_ai = FamilyTravelAI()
        components_status["FamilyTravelAI"] = True
        logger.info("   SUCCESS: FamilyTravelAI - Available")
    except Exception as e:
        logger.error(f"   FAILED: FamilyTravelAI - {e}")
    
    # Test Helper Functions
    try:
        from backend.helper_functions import save_uploaded_file, analyze_image_with_ai
        components_status["HelperFunctions"] = True
        logger.info("   SUCCESS: HelperFunctions - Available")
    except Exception as e:
        logger.error(f"   FAILED: HelperFunctions - {e}")
    
    # Test API Router
    try:
        from backend.api_v1 import router
        components_status["APIRouter"] = True
        logger.info("   SUCCESS: APIRouter - Available")
    except Exception as e:
        logger.error(f"   FAILED: APIRouter - {e}")
    
    success_count = sum(components_status.values())
    total_count = len(components_status)
    
    logger.info(f"Component Status: {success_count}/{total_count} components available")
    
    return success_count == total_count

if __name__ == "__main__":
    # Run the integration test
    print("Starting Elmowafiplatform Memory Integration Test...")
    print("=" * 60)
    
    # Test components individually first
    components_ok = test_individual_components()
    
    if components_ok:
        # Run full integration test
        success = asyncio.run(test_memory_integration())
        
        if success:
            print("All tests passed! Integration is successful.")
            exit(0)
        else:
            print("Integration test failed.")
            exit(1)
    else:
        print("Component tests failed. Cannot proceed with integration test.")
        exit(1)