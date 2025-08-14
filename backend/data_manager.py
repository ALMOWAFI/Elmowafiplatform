import json
import csv
import zipfile
import os
import shutil
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Optional
import base64
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataManager:
    def __init__(self, db_path: str = "data/elmowafiplatform.db", data_dir: str = "data"):
        self.db_path = db_path
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Import database manager
        from database import ElmowafyDatabase
        self.db = ElmowafyDatabase(db_path)
    
    def get_family_members(self) -> List[Dict[str, Any]]:
        """Get all family members"""
        try:
            return self.db.get_family_members()
        except Exception as e:
            logger.error(f"Error getting family members: {e}")
            return []
    
    def get_memories(self) -> List[Dict[str, Any]]:
        """Get all memories"""
        return self.db.get_memories()
        
    def export_all_data(self, family_id: str = "elmowafi_family", format: str = "json") -> Dict[str, Any]:
        """Export all family data in the specified format"""
        try:
            export_data = {
                "metadata": {
                    "export_date": datetime.now().isoformat(),
                    "family_id": family_id,
                    "platform_version": "1.0.0",
                    "format_version": "1.0"
                },
                "users": self._export_users(family_id),
                "memories": self._export_memories(family_id),
                "events": self._export_events(family_id),
                "achievements": self._export_achievements(family_id),
                "travel_plans": self._export_travel_plans(family_id),
                "family_tree": self._export_family_tree(family_id),
                "settings": self._export_settings(family_id)
            }
            
            if format.lower() == "json":
                return self._export_as_json(export_data)
            elif format.lower() == "csv":
                return self._export_as_csv(export_data)
            elif format.lower() == "zip":
                return self._export_as_zip(export_data)
            else:
                raise ValueError(f"Unsupported export format: {format}")
                
        except Exception as e:
            logger.error(f"Export failed: {e}")
            raise

    def _export_users(self, family_id: str) -> List[Dict[str, Any]]:
        """Export user data"""
        # In a real implementation, this would query the database
        return [
            {
                "id": "1",
                "email": "ahmad@elmowafi.com",
                "full_name": "Ahmad El-Mowafi",
                "date_of_birth": "1990-05-15",
                "phone": "+1 (555) 123-4567",
                "location": "Cairo, Egypt",
                "bio": "Family organizer and travel enthusiast.",
                "family_role": "Father",
                "joined_date": "2024-01-15",
                "preferences": {
                    "theme": "auto",
                    "language": "en",
                    "notifications": {
                        "email": True,
                        "push": True,
                        "sms": False
                    }
                }
            },
            {
                "id": "2",
                "email": "fatima@elmowafi.com",
                "full_name": "Fatima El-Mowafi",
                "date_of_birth": "1992-08-20",
                "family_role": "Mother",
                "joined_date": "2024-01-15"
            },
            {
                "id": "3",
                "email": "omar@elmowafi.com",
                "full_name": "Omar El-Mowafi",
                "date_of_birth": "2008-02-15",
                "family_role": "Son",
                "joined_date": "2024-01-16"
            },
            {
                "id": "4",
                "email": "layla@elmowafi.com",
                "full_name": "Layla El-Mowafi",
                "date_of_birth": "2012-07-10",
                "family_role": "Daughter",
                "joined_date": "2024-01-16"
            }
        ]

    def _export_memories(self, family_id: str) -> List[Dict[str, Any]]:
        """Export memory data"""
        return [
            {
                "id": "1",
                "title": "Trip to Pyramids",
                "description": "Amazing family day exploring the Great Pyramids of Giza",
                "date": "2024-01-10",
                "location": "Giza, Egypt",
                "tags": ["family", "history", "pyramids", "egypt"],
                "photos": ["pyramid1.jpg", "pyramid2.jpg", "family_pyramid.jpg"],
                "created_by": "1",
                "created_at": "2024-01-10T18:00:00Z",
                "likes": 12,
                "comments": [
                    {
                        "id": "1",
                        "user_id": "2",
                        "content": "What an amazing day!",
                        "timestamp": "2024-01-10T19:00:00Z"
                    }
                ]
            },
            {
                "id": "2",
                "title": "Omar's Birthday",
                "description": "Celebrating Omar turning 16",
                "date": "2024-02-15",
                "location": "Home",
                "tags": ["birthday", "celebration", "omar"],
                "photos": ["birthday_cake.jpg", "family_photo.jpg"],
                "created_by": "1",
                "created_at": "2024-02-15T20:00:00Z",
                "likes": 15,
                "comments": []
            }
        ]

    def _export_events(self, family_id: str) -> List[Dict[str, Any]]:
        """Export event data"""
        return [
            {
                "id": "1",
                "title": "Omar's Birthday Party",
                "description": "Celebrating Omar turning 16",
                "date": "2024-02-15",
                "time": "19:00",
                "location": "Home",
                "type": "birthday",
                "priority": "high",
                "attendees": ["1", "2", "3", "4"],
                "created_by": "1",
                "reminders": ["1day", "1hour"]
            },
            {
                "id": "2",
                "title": "Family Trip to Alexandria",
                "description": "Weekend getaway to the Mediterranean coast",
                "date": "2024-02-20",
                "time": "08:00",
                "location": "Alexandria, Egypt",
                "type": "travel",
                "priority": "high",
                "attendees": ["1", "2", "3", "4"],
                "created_by": "1",
                "reminders": ["3days", "1day"]
            }
        ]

    def _export_achievements(self, family_id: str) -> List[Dict[str, Any]]:
        """Export achievement data"""
        return [
            {
                "id": "1",
                "title": "First Memory",
                "description": "Upload your first family memory",
                "category": "memories",
                "type": "milestone",
                "rarity": "common",
                "points": 10,
                "unlocked": True,
                "unlocked_date": "2024-01-15",
                "unlocked_by": "1"
            },
            {
                "id": "2",
                "title": "Family Historian",
                "description": "Document 50+ family memories",
                "category": "memories",
                "type": "milestone",
                "rarity": "epic",
                "points": 150,
                "unlocked": True,
                "unlocked_date": "2024-01-20",
                "unlocked_by": "1"
            }
        ]

    def _export_travel_plans(self, family_id: str) -> List[Dict[str, Any]]:
        """Export travel plan data"""
        return [
            {
                "id": "1",
                "title": "Summer Vacation 2024",
                "destination": "Turkey",
                "start_date": "2024-06-15",
                "end_date": "2024-06-25",
                "status": "planning",
                "budget": 5000,
                "participants": ["1", "2", "3", "4"],
                "itinerary": [
                    {
                        "day": 1,
                        "date": "2024-06-15",
                        "activities": ["Arrival in Istanbul", "Check-in to hotel", "Explore Sultanahmet"]
                    }
                ]
            }
        ]

    def _export_family_tree(self, family_id: str) -> Dict[str, Any]:
        """Export family tree data"""
        return {
            "root_person_id": "1",
            "relationships": [
                {"person1_id": "1", "person2_id": "2", "relationship": "spouse"},
                {"person1_id": "1", "person2_id": "3", "relationship": "parent"},
                {"person1_id": "1", "person2_id": "4", "relationship": "parent"},
                {"person1_id": "2", "person2_id": "3", "relationship": "parent"},
                {"person1_id": "2", "person2_id": "4", "relationship": "parent"}
            ]
        }

    def _export_settings(self, family_id: str) -> Dict[str, Any]:
        """Export family settings"""
        return {
            "family_name": "El-Mowafi Family",
            "privacy_settings": {
                "default_memory_visibility": "family",
                "location_sharing": True,
                "activity_sharing": True
            },
            "notification_settings": {
                "daily_digest": True,
                "weekly_summary": True,
                "achievement_alerts": True
            }
        }

    def _export_as_json(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Export data as JSON"""
        filename = f"family_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = self.data_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        
        return {
            "success": True,
            "format": "json",
            "filename": filename,
            "filepath": str(filepath),
            "size_bytes": filepath.stat().st_size,
            "record_count": self._count_records(data)
        }

    def _export_as_csv(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Export data as CSV files in a ZIP archive"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        zip_filename = f"family_export_csv_{timestamp}.zip"
        zip_filepath = self.data_dir / zip_filename
        
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Export each data type as a separate CSV
            for data_type, records in data.items():
                if data_type == "metadata":
                    continue
                    
                if isinstance(records, list) and records:
                    csv_filename = f"{data_type}.csv"
                    csv_content = self._convert_to_csv(records)
                    zipf.writestr(csv_filename, csv_content)
            
            # Add metadata as JSON
            zipf.writestr("metadata.json", json.dumps(data["metadata"], indent=2))
        
        return {
            "success": True,
            "format": "csv",
            "filename": zip_filename,
            "filepath": str(zip_filepath),
            "size_bytes": zip_filepath.stat().st_size,
            "record_count": self._count_records(data)
        }

    def _export_as_zip(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Export data as a comprehensive ZIP archive with JSON and media files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        zip_filename = f"family_export_complete_{timestamp}.zip"
        zip_filepath = self.data_dir / zip_filename
        
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add main data as JSON
            zipf.writestr("family_data.json", json.dumps(data, indent=2, ensure_ascii=False, default=str))
            
            # Add README with instructions
            readme_content = self._generate_readme()
            zipf.writestr("README.txt", readme_content)
            
            # In a real implementation, add media files
            # self._add_media_files(zipf, data)
        
        return {
            "success": True,
            "format": "zip",
            "filename": zip_filename,
            "filepath": str(zip_filepath),
            "size_bytes": zip_filepath.stat().st_size,
            "record_count": self._count_records(data)
        }

    def _convert_to_csv(self, records: List[Dict[str, Any]]) -> str:
        """Convert list of records to CSV format"""
        if not records:
            return ""
        
        # Flatten nested dictionaries
        flattened_records = []
        for record in records:
            flattened = self._flatten_dict(record)
            flattened_records.append(flattened)
        
        # Get all unique keys
        all_keys = set()
        for record in flattened_records:
            all_keys.update(record.keys())
        
        # Create CSV content
        import io
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=sorted(all_keys))
        writer.writeheader()
        writer.writerows(flattened_records)
        
        return output.getvalue()

    def _flatten_dict(self, d: Dict[str, Any], parent_key: str = '', sep: str = '_') -> Dict[str, Any]:
        """Flatten nested dictionary"""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep=sep).items())
            elif isinstance(v, list):
                items.append((new_key, json.dumps(v)))
            else:
                items.append((new_key, v))
        return dict(items)

    def _count_records(self, data: Dict[str, Any]) -> Dict[str, int]:
        """Count records in each data type"""
        counts = {}
        for data_type, records in data.items():
            if data_type == "metadata":
                continue
            if isinstance(records, list):
                counts[data_type] = len(records)
            else:
                counts[data_type] = 1
        return counts

    def _generate_readme(self) -> str:
        """Generate README file for export"""
        return """
Family Platform Data Export
===========================

This archive contains a complete export of your family platform data.

Contents:
---------
- family_data.json: Complete data in JSON format
- README.txt: This file

Data Structure:
--------------
The JSON file contains the following sections:
- metadata: Export information and timestamps
- users: Family member profiles and preferences
- memories: Photos, videos, and shared memories
- events: Calendar events and celebrations
- achievements: Unlocked badges and milestones
- travel_plans: Trip planning and itineraries
- family_tree: Family relationships and connections
- settings: Privacy and notification preferences

Import Instructions:
-------------------
To import this data back into the Family Platform:
1. Log into your family account
2. Go to Settings > Data Management
3. Select "Import Data"
4. Upload this ZIP file
5. Review the data preview
6. Confirm the import

Note: Importing will merge with existing data. Duplicate detection is automatic.

Export Date: {export_date}
Platform Version: 1.0.0
Format Version: 1.0

For support, contact: support@familyplatform.com
        """.format(export_date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def import_data(self, import_file: str, family_id: str = "elmowafi_family", merge_strategy: str = "merge") -> Dict[str, Any]:
        """Import family data from file"""
        try:
            filepath = Path(import_file)
            
            if not filepath.exists():
                raise FileNotFoundError(f"Import file not found: {import_file}")
            
            # Determine file type and extract data
            if filepath.suffix.lower() == '.json':
                data = self._import_from_json(filepath)
            elif filepath.suffix.lower() == '.zip':
                data = self._import_from_zip(filepath)
            else:
                raise ValueError(f"Unsupported import format: {filepath.suffix}")
            
            # Validate data structure
            self._validate_import_data(data)
            
            # Import data based on merge strategy
            import_result = self._import_to_database(data, family_id, merge_strategy)
            
            return {
                "success": True,
                "imported_records": import_result,
                "import_date": datetime.now().isoformat(),
                "merge_strategy": merge_strategy
            }
            
        except Exception as e:
            logger.error(f"Import failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "import_date": datetime.now().isoformat()
            }

    def _import_from_json(self, filepath: Path) -> Dict[str, Any]:
        """Import data from JSON file"""
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _import_from_zip(self, filepath: Path) -> Dict[str, Any]:
        """Import data from ZIP file"""
        with zipfile.ZipFile(filepath, 'r') as zipf:
            # Look for main data file
            if 'family_data.json' in zipf.namelist():
                with zipf.open('family_data.json') as f:
                    return json.load(f)
            else:
                raise ValueError("No family_data.json found in ZIP archive")

    def _validate_import_data(self, data: Dict[str, Any]) -> None:
        """Validate import data structure"""
        required_sections = ['metadata', 'users', 'memories', 'events']
        
        for section in required_sections:
            if section not in data:
                raise ValueError(f"Missing required section: {section}")
        
        # Validate metadata
        metadata = data.get('metadata', {})
        if 'format_version' not in metadata:
            raise ValueError("Missing format version in metadata")

    def _import_to_database(self, data: Dict[str, Any], family_id: str, merge_strategy: str) -> Dict[str, int]:
        """Import data to database (mock implementation)"""
        # In a real implementation, this would update the actual database
        imported_counts = {}
        
        for data_type, records in data.items():
            if data_type == "metadata":
                continue
                
            if isinstance(records, list):
                imported_counts[data_type] = len(records)
                logger.info(f"Would import {len(records)} {data_type} records")
            else:
                imported_counts[data_type] = 1
                logger.info(f"Would import 1 {data_type} record")
        
        return imported_counts

    def backup_database(self) -> Dict[str, Any]:
        """Create a backup of the entire database"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"database_backup_{timestamp}.db"
        backup_filepath = self.data_dir / backup_filename
        
        try:
            # In a real implementation, copy the actual database file
            # shutil.copy2(self.db_path, backup_filepath)
            
            # For demo, create a mock backup file
            with open(backup_filepath, 'w') as f:
                f.write(f"Database backup created at {datetime.now().isoformat()}")
            
            return {
                "success": True,
                "backup_filename": backup_filename,
                "backup_filepath": str(backup_filepath),
                "backup_date": datetime.now().isoformat(),
                "size_bytes": backup_filepath.stat().st_size
            }
            
        except Exception as e:
            logger.error(f"Database backup failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "backup_date": datetime.now().isoformat()
            }

    def restore_from_backup(self, backup_file: str) -> Dict[str, Any]:
        """Restore database from backup"""
        try:
            backup_path = Path(backup_file)
            
            if not backup_path.exists():
                raise FileNotFoundError(f"Backup file not found: {backup_file}")
            
            # In a real implementation, restore the database
            # shutil.copy2(backup_path, self.db_path)
            
            return {
                "success": True,
                "restored_from": backup_file,
                "restore_date": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Database restore failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "restore_date": datetime.now().isoformat()
            }

    def list_exports(self) -> List[Dict[str, Any]]:
        """List all available export files"""
        exports = []
        
        for file_path in self.data_dir.glob("family_export_*"):
            if file_path.is_file():
                stat = file_path.stat()
                exports.append({
                    "filename": file_path.name,
                    "filepath": str(file_path),
                    "size_bytes": stat.st_size,
                    "created_date": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "format": self._detect_format(file_path)
                })
        
        return sorted(exports, key=lambda x: x['created_date'], reverse=True)

    def list_backups(self) -> List[Dict[str, Any]]:
        """List all available backup files"""
        backups = []
        
        for file_path in self.data_dir.glob("database_backup_*"):
            if file_path.is_file():
                stat = file_path.stat()
                backups.append({
                    "filename": file_path.name,
                    "filepath": str(file_path),
                    "size_bytes": stat.st_size,
                    "created_date": datetime.fromtimestamp(stat.st_ctime).isoformat()
                })
        
        return sorted(backups, key=lambda x: x['created_date'], reverse=True)

    def _detect_format(self, file_path: Path) -> str:
        """Detect export format from filename"""
        name = file_path.name.lower()
        if 'csv' in name:
            return 'csv'
        elif 'complete' in name:
            return 'zip'
        else:
            return 'json'

    def cleanup_old_exports(self, keep_count: int = 10) -> Dict[str, Any]:
        """Clean up old export files, keeping only the most recent ones"""
        exports = self.list_exports()
        backups = self.list_backups()
        
        deleted_exports = 0
        deleted_backups = 0
        
        # Delete old exports
        if len(exports) > keep_count:
            for export in exports[keep_count:]:
                try:
                    Path(export['filepath']).unlink()
                    deleted_exports += 1
                except Exception as e:
                    logger.error(f"Failed to delete export {export['filename']}: {e}")
        
        # Delete old backups
        if len(backups) > keep_count:
            for backup in backups[keep_count:]:
                try:
                    Path(backup['filepath']).unlink()
                    deleted_backups += 1
                except Exception as e:
                    logger.error(f"Failed to delete backup {backup['filename']}: {e}")
        
        return {
            "deleted_exports": deleted_exports,
            "deleted_backups": deleted_backups,
            "remaining_exports": len(exports) - deleted_exports,
            "remaining_backups": len(backups) - deleted_backups
        }

    # === NEW API INTEGRATION METHODS ===
    
    async def create_family_member(self, member_data: Dict[str, Any]) -> str:
        """Create a new family member"""
        try:
            member_id = self.db.create_family_member(member_data)
            logger.info(f"Created family member: {member_id}")
            return member_id
        except Exception as e:
            logger.error(f"Error creating family member: {e}")
            raise

    async def update_family_member(self, member_id: str, updates: Dict[str, Any]) -> bool:
        """Update a family member"""
        try:
            success = self.db.update_family_member(member_id, updates)
            logger.info(f"Updated family member: {member_id}")
            return success
        except Exception as e:
            logger.error(f"Error updating family member: {e}")
            raise

    async def get_memories(self, family_member_id: str = None, start_date: str = None, 
                          end_date: str = None, tags: List[str] = None) -> List[Dict[str, Any]]:
        """Get memories with optional filters"""
        try:
            # Build filters dict for database method
            filters = {}
            if family_member_id:
                filters["familyMemberId"] = family_member_id
            if start_date:
                filters["startDate"] = start_date
            if end_date:
                filters["endDate"] = end_date
            if tags:
                filters["tags"] = tags
            
            return self.db.get_memories(filters if filters else None)
        except Exception as e:
            logger.error(f"Error getting memories: {e}")
            return []

    async def create_memory(self, memory_data: Dict[str, Any]) -> str:
        """Create a new memory"""
        try:
            memory_id = self.db.create_memory(memory_data)
            logger.info(f"Created memory: {memory_id}")
            return memory_id
        except Exception as e:
            logger.error(f"Error creating memory: {e}")
            raise

    async def update_memory(self, memory_id: str, updates: Dict[str, Any]) -> bool:
        """Update a memory"""
        try:
            success = self.db.update_memory(memory_id, updates)
            logger.info(f"Updated memory: {memory_id}")
            return success
        except Exception as e:
            logger.error(f"Error updating memory: {e}")
            raise

    async def save_uploaded_file(self, file, category: str = "uploads") -> Path:
        """Save an uploaded file and return the path"""
        try:
            # Create category directory
            upload_dir = self.data_dir / category
            upload_dir.mkdir(exist_ok=True)
            
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{file.filename}"
            file_path = upload_dir / filename
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            logger.info(f"Saved uploaded file: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error saving uploaded file: {e}")
            raise

    async def get_memory_suggestions(self, date: str = None, family_member: str = None) -> Dict[str, Any]:
        """Get smart memory suggestions"""
        try:
            # For now, return mock data - in real implementation this would use AI
            suggestions = {
                "on_this_day": [],
                "similar_memories": [],
                "family_connections": [],
                "contextual_suggestions": [
                    "Upload more photos from recent family gatherings",
                    "Add location tags to memories for better organization",
                    "Consider creating a travel plan for upcoming holidays"
                ]
            }
            
            # Get some actual memories if available
            try:
                memories = self.db.get_memories()
                if memories:
                    suggestions["similar_memories"] = memories[:3]
            except Exception as e:
                logger.error(f"Error getting memories for suggestions: {e}")
                # Keep default empty suggestions
            
            return suggestions
        except Exception as e:
            logger.error(f"Error getting memory suggestions: {e}")
            raise

    async def get_memory_timeline(self, limit: int = 50, offset: int = 0, 
                                family_member: str = None, date_from: str = None, 
                                date_to: str = None) -> List[Dict[str, Any]]:
        """Get AI-organized memory timeline"""
        try:
            # Build filters for database query
            filters = {}
            if family_member:
                filters["familyMemberId"] = family_member
            if date_from:
                filters["startDate"] = date_from
            if date_to:
                filters["endDate"] = date_to
            
            memories = self.db.get_memories(filters if filters else None)
            
            # Sort by date and apply pagination
            sorted_memories = sorted(memories, key=lambda x: x.get('date', ''), reverse=True)
            return sorted_memories[offset:offset + limit]
            
        except Exception as e:
            logger.error(f"Error getting memory timeline: {e}")
            raise

    async def search_memories(self, query: str, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Search memories with AI-enhanced results"""
        try:
            # Simple text search for now - can be enhanced with AI
            all_memories = self.db.get_memories()
            
            if not query:
                return all_memories
            
            # Basic text search in title and description
            query_lower = query.lower()
            results = []
            
            for memory in all_memories:
                if (query_lower in memory.get('title', '').lower() or 
                    query_lower in memory.get('description', '').lower() or
                    any(query_lower in tag.lower() for tag in memory.get('tags', []))):
                    results.append(memory)
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching memories: {e}")
            raise

    async def get_travel_recommendations(self, budget: str = None, duration: str = None, 
                                       interests: List[str] = None) -> Dict[str, Any]:
        """Get AI travel recommendations"""
        try:
            # Mock travel recommendations - in real implementation this would use AI
            recommendations = {
                "suggestions": [
                    {
                        "destination": "Dubai, UAE",
                        "reason": "Perfect for family activities with modern attractions and cultural experiences",
                        "activities": ["Burj Khalifa", "Dubai Mall", "Desert Safari", "Palm Jumeirah"],
                        "estimated_budget": budget or "$2000-3000",
                        "family_friendly": True
                    },
                    {
                        "destination": "Istanbul, Turkey",
                        "reason": "Rich cultural heritage with amazing food and historical sites",
                        "activities": ["Hagia Sophia", "Grand Bazaar", "Bosphorus Cruise", "Turkish Bath"],
                        "estimated_budget": budget or "$1500-2500",
                        "family_friendly": True
                    }
                ],
                "reasoning": "Based on family-friendly destinations with cultural significance",
                "confidence": 0.85,
                "family_context": {
                    "visited_locations": 0,
                    "preferred_activities": interests or ["culture", "adventure", "food"]
                }
            }
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting travel recommendations: {e}")
            raise

    async def create_travel_plan(self, plan_data: Dict[str, Any]) -> str:
        """Create a travel plan"""
        try:
            plan_id = self.db.create_travel_plan(plan_data)
            logger.info(f"Created travel plan: {plan_id}")
            return plan_id
        except Exception as e:
            logger.error(f"Error creating travel plan: {e}")
            raise

    async def get_travel_plans(self, family_member_id: str = None) -> List[Dict[str, Any]]:
        """Get travel plans"""
        try:
            return self.db.get_travel_plans(family_member_id=family_member_id)
        except Exception as e:
            logger.error(f"Error getting travel plans: {e}")
            raise