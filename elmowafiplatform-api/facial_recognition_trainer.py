#!/usr/bin/env python3
"""
Advanced Facial Recognition Training System for Elmowafiplatform
Learns family member faces from uploaded photos and improves recognition accuracy over time
"""

import os
import cv2
import numpy as np
import json
import pickle
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
import logging
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import sqlite3

# Optional face recognition import
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    print("Warning: face_recognition module not found. Facial recognition features will be limited.")
    FACE_RECOGNITION_AVAILABLE = False

logger = logging.getLogger(__name__)

class FamilyFaceTrainer:
    """Advanced facial recognition training system for family members"""
    
    def __init__(self, db_path: str = "data/elmowafiplatform.db"):
        self.db_path = db_path
        self.model_dir = Path("data/face_models")
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        # Face recognition models
        self.face_encodings = {}  # family_member_id -> list of encodings
        self.face_classifier = None
        self.label_encoder = LabelEncoder()
        
        # Training parameters
        self.confidence_threshold = 0.6
        self.min_samples_per_person = 3
        self.max_samples_per_person = 50
        
        # Load existing models
        self.load_trained_models()
    
    def extract_face_encodings(self, image_path: str) -> List[np.ndarray]:
        """Extract face encodings from an image using face_recognition library"""
        if not FACE_RECOGNITION_AVAILABLE:
            logger.warning("Face recognition library not available")
            return []
            
        try:
            # Load image
            image = face_recognition.load_image_file(image_path)
            
            # Find face locations
            face_locations = face_recognition.face_locations(image, model="hog")
            
            if not face_locations:
                logger.warning(f"No faces found in {image_path}")
                return []
            
            # Extract face encodings
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            logger.info(f"Extracted {len(face_encodings)} face encodings from {image_path}")
            return face_encodings
            
        except Exception as e:
            logger.error(f"Error extracting face encodings from {image_path}: {e}")
            return []
    
    def add_training_sample(self, family_member_id: str, image_path: str, verified: bool = False) -> Dict[str, Any]:
        """Add a training sample for a family member"""
        if not FACE_RECOGNITION_AVAILABLE:
            return {
                "success": False,
                "message": "Face recognition library not available",
                "encodings_added": 0
            }
            
        try:
            # Extract face encodings
            encodings = self.extract_face_encodings(image_path)
            
            if not encodings:
                return {
                    "success": False,
                    "error": "No faces found in image",
                    "encodings_extracted": 0
                }
            
            # Initialize if first sample for this person
            if family_member_id not in self.face_encodings:
                self.face_encodings[family_member_id] = []
            
            # Add new encodings (limit per person)
            current_count = len(self.face_encodings[family_member_id])
            new_encodings = encodings[:max(0, self.max_samples_per_person - current_count)]
            
            self.face_encodings[family_member_id].extend(new_encodings)
            
            # Store training sample in database
            self._store_training_sample(family_member_id, image_path, len(new_encodings), verified)
            
            # Retrain model if we have enough samples
            if current_count >= self.min_samples_per_person:
                self.train_classifier()
            
            return {
                "success": True,
                "encodings_extracted": len(new_encodings),
                "total_samples": len(self.face_encodings[family_member_id]),
                "model_retrained": current_count >= self.min_samples_per_person
            }
            
        except Exception as e:
            logger.error(f"Error adding training sample: {e}")
            return {
                "success": False,
                "error": str(e),
                "encodings_extracted": 0
            }
    
    def train_classifier(self) -> Dict[str, Any]:
        """Train the face recognition classifier"""
        try:
            # Prepare training data
            X = []  # Face encodings
            y = []  # Labels (family member IDs)
            
            for member_id, encodings in self.face_encodings.items():
                if len(encodings) >= self.min_samples_per_person:
                    for encoding in encodings:
                        X.append(encoding)
                        y.append(member_id)
            
            if len(set(y)) < 2:
                return {
                    "success": False,
                    "error": f"Need at least 2 people with {self.min_samples_per_person}+ samples each",
                    "current_people": len(set(y))
                }
            
            X = np.array(X)
            y = np.array(y)
            
            # Encode labels
            y_encoded = self.label_encoder.fit_transform(y)
            
            # Split data for validation
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
            
            # Train SVM classifier
            self.face_classifier = SVC(
                kernel='rbf',
                probability=True,
                C=1.0,
                gamma='scale'
            )
            
            self.face_classifier.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = self.face_classifier.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Save trained model
            self.save_trained_models()
            
            # Update training log
            self._log_training_session(accuracy, len(X), len(set(y)))
            
            logger.info(f"Model trained successfully. Accuracy: {accuracy:.3f}")
            
            return {
                "success": True,
                "accuracy": accuracy,
                "training_samples": len(X),
                "people_count": len(set(y)),
                "model_saved": True
            }
            
        except Exception as e:
            logger.error(f"Error training classifier: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def identify_faces(self, image_path: str) -> List[Dict[str, Any]]:
        """Identify faces in an image using trained model"""
        try:
            if self.face_classifier is None:
                return [{
                    "error": "No trained model available",
                    "confidence": 0.0,
                    "family_member_id": None
                }]
            
            # Extract face encodings from image
            encodings = self.extract_face_encodings(image_path)
            
            if not encodings:
                return []
            
            results = []
            
            for i, encoding in enumerate(encodings):
                # Predict using trained classifier
                probabilities = self.face_classifier.predict_proba([encoding])[0]
                predicted_label = self.face_classifier.predict([encoding])[0]
                
                # Get confidence score
                confidence = max(probabilities)
                
                # Convert back to family member ID
                if confidence >= self.confidence_threshold:
                    family_member_id = self.label_encoder.inverse_transform([predicted_label])[0]
                else:
                    family_member_id = None
                
                results.append({
                    "face_index": i,
                    "family_member_id": family_member_id,
                    "confidence": float(confidence),
                    "all_probabilities": {
                        self.label_encoder.inverse_transform([j])[0]: float(prob) 
                        for j, prob in enumerate(probabilities)
                    }
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error identifying faces: {e}")
            return [{
                "error": str(e),
                "confidence": 0.0,
                "family_member_id": None
            }]
    
    def get_training_suggestions(self, family_member_id: str) -> Dict[str, Any]:
        """Get suggestions for improving face recognition for a family member"""
        current_samples = len(self.face_encodings.get(family_member_id, []))
        
        suggestions = []
        priority = "low"
        
        if current_samples == 0:
            suggestions.append("Add initial photos of this family member")
            priority = "high"
        elif current_samples < self.min_samples_per_person:
            needed = self.min_samples_per_person - current_samples
            suggestions.append(f"Add {needed} more photo(s) to enable face recognition")
            priority = "high"
        elif current_samples < 10:
            suggestions.append("Add more varied photos (different angles, lighting)")
            priority = "medium"
        elif current_samples < 20:
            suggestions.append("Add photos from different time periods for better accuracy")
            priority = "low"
        
        # Additional suggestions based on model performance
        if self.face_classifier is not None:
            suggestions.extend([
                "Include photos with different expressions",
                "Add photos with and without glasses/accessories",
                "Include photos from different ages if available"
            ])
        
        return {
            "family_member_id": family_member_id,
            "current_samples": current_samples,
            "min_required": self.min_samples_per_person,
            "max_allowed": self.max_samples_per_person,
            "priority": priority,
            "suggestions": suggestions,
            "can_train": current_samples >= self.min_samples_per_person
        }
    
    def analyze_training_quality(self) -> Dict[str, Any]:
        """Analyze the quality of current training data"""
        analysis = {
            "total_people": len(self.face_encodings),
            "people_ready": 0,
            "people_need_more": 0,
            "total_samples": 0,
            "average_samples_per_person": 0,
            "model_trained": self.face_classifier is not None,
            "recommendations": []
        }
        
        for member_id, encodings in self.face_encodings.items():
            sample_count = len(encodings)
            analysis["total_samples"] += sample_count
            
            if sample_count >= self.min_samples_per_person:
                analysis["people_ready"] += 1
            else:
                analysis["people_need_more"] += 1
        
        if analysis["total_people"] > 0:
            analysis["average_samples_per_person"] = analysis["total_samples"] / analysis["total_people"]
        
        # Generate recommendations
        if analysis["people_ready"] < 2:
            analysis["recommendations"].append("Need at least 2 people with sufficient samples to train model")
        
        if analysis["people_need_more"] > 0:
            analysis["recommendations"].append(f"{analysis['people_need_more']} people need more training photos")
        
        if not analysis["model_trained"] and analysis["people_ready"] >= 2:
            analysis["recommendations"].append("Ready to train face recognition model")
        
        return analysis
    
    def save_trained_models(self):
        """Save trained models to disk"""
        try:
            # Save face encodings
            encodings_path = self.model_dir / "face_encodings.pkl"
            with open(encodings_path, 'wb') as f:
                pickle.dump(self.face_encodings, f)
            
            # Save classifier
            if self.face_classifier is not None:
                classifier_path = self.model_dir / "face_classifier.pkl"
                with open(classifier_path, 'wb') as f:
                    pickle.dump(self.face_classifier, f)
                
                # Save label encoder
                encoder_path = self.model_dir / "label_encoder.pkl"
                with open(encoder_path, 'wb') as f:
                    pickle.dump(self.label_encoder, f)
            
            logger.info("Models saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    def load_trained_models(self):
        """Load trained models from disk"""
        try:
            # Load face encodings
            encodings_path = self.model_dir / "face_encodings.pkl"
            if encodings_path.exists():
                with open(encodings_path, 'rb') as f:
                    self.face_encodings = pickle.load(f)
                logger.info(f"Loaded face encodings for {len(self.face_encodings)} people")
            
            # Load classifier
            classifier_path = self.model_dir / "face_classifier.pkl"
            encoder_path = self.model_dir / "label_encoder.pkl"
            
            if classifier_path.exists() and encoder_path.exists():
                with open(classifier_path, 'rb') as f:
                    self.face_classifier = pickle.load(f)
                
                with open(encoder_path, 'rb') as f:
                    self.label_encoder = pickle.load(f)
                
                logger.info("Loaded trained face recognition model")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            # Reset to empty state
            self.face_encodings = {}
            self.face_classifier = None
    
    def _store_training_sample(self, family_member_id: str, image_path: str, encodings_count: int, verified: bool):
        """Store training sample record in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Create training samples table if it doesn't exist
            conn.execute("""
                CREATE TABLE IF NOT EXISTS face_training_samples (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    family_member_id TEXT NOT NULL,
                    image_path TEXT NOT NULL,
                    encodings_count INTEGER NOT NULL,
                    verified BOOLEAN NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            
            # Insert training sample record
            conn.execute("""
                INSERT INTO face_training_samples 
                (family_member_id, image_path, encodings_count, verified, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                family_member_id,
                image_path,
                encodings_count,
                verified,
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing training sample: {e}")
    
    def _log_training_session(self, accuracy: float, sample_count: int, people_count: int):
        """Log training session results"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Create training log table if it doesn't exist
            conn.execute("""
                CREATE TABLE IF NOT EXISTS face_training_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    accuracy REAL NOT NULL,
                    sample_count INTEGER NOT NULL,
                    people_count INTEGER NOT NULL,
                    model_version TEXT NOT NULL,
                    training_time TEXT NOT NULL
                )
            """)
            
            # Insert training log
            conn.execute("""
                INSERT INTO face_training_log 
                (accuracy, sample_count, people_count, model_version, training_time)
                VALUES (?, ?, ?, ?, ?)
            """, (
                accuracy,
                sample_count,
                people_count,
                "svm_v1",
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error logging training session: {e}")
    
    def get_training_history(self) -> List[Dict[str, Any]]:
        """Get training history from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.execute("""
                SELECT * FROM face_training_log 
                ORDER BY training_time DESC 
                LIMIT 20
            """)
            
            history = []
            for row in cursor.fetchall():
                history.append({
                    "id": row["id"],
                    "accuracy": row["accuracy"],
                    "sample_count": row["sample_count"],
                    "people_count": row["people_count"],
                    "model_version": row["model_version"],
                    "training_time": row["training_time"]
                })
            
            conn.close()
            return history
            
        except Exception as e:
            logger.error(f"Error getting training history: {e}")
            return []
    
    def remove_training_samples(self, family_member_id: str) -> bool:
        """Remove all training samples for a family member"""
        try:
            if family_member_id in self.face_encodings:
                del self.face_encodings[family_member_id]
                
                # Save updated encodings
                self.save_trained_models()
                
                # If we still have enough data, retrain
                if len([m for m, e in self.face_encodings.items() if len(e) >= self.min_samples_per_person]) >= 2:
                    self.train_classifier()
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error removing training samples: {e}")
            return False

# Global trainer instance
face_trainer = FamilyFaceTrainer()