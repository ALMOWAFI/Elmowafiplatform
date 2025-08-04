#!/usr/bin/env python3
"""
Pagination System for Elmowafiplatform
Implements cursor-based and page-based pagination for all large dataset queries
"""

import logging
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass
from datetime import datetime
import base64
import json
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class PaginationParams:
    """Pagination parameters"""
    page: int = 1
    page_size: int = 20
    cursor: Optional[str] = None
    limit: Optional[int] = None
    offset: Optional[int] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"  # asc or desc

@dataclass
class PaginationResult:
    """Pagination result with metadata"""
    items: List[Dict[str, Any]]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool
    next_cursor: Optional[str] = None
    previous_cursor: Optional[str] = None
    next_page_url: Optional[str] = None
    previous_page_url: Optional[str] = None

class PaginationManager:
    """Comprehensive pagination manager for the platform"""
    
    def __init__(self):
        self.default_page_size = 20
        self.max_page_size = 100
        self.cursor_secret = "elmowafi_pagination_secret_2024"
    
    def validate_pagination_params(self, params: PaginationParams) -> PaginationParams:
        """Validate and normalize pagination parameters"""
        # Validate page size
        if params.page_size > self.max_page_size:
            params.page_size = self.max_page_size
        elif params.page_size < 1:
            params.page_size = self.default_page_size
        
        # Validate page number
        if params.page < 1:
            params.page = 1
        
        # Validate sort order
        if params.sort_order not in ["asc", "desc"]:
            params.sort_order = "desc"
        
        # Calculate offset for page-based pagination
        if params.offset is None:
            params.offset = (params.page - 1) * params.page_size
        
        # Set limit if not provided
        if params.limit is None:
            params.limit = params.page_size
        
        return params
    
    def encode_cursor(self, data: Dict[str, Any]) -> str:
        """Encode cursor data to base64 string"""
        try:
            # Add timestamp for uniqueness
            data["timestamp"] = datetime.now().isoformat()
            json_data = json.dumps(data, sort_keys=True)
            
            # Add hash for integrity
            data_hash = hashlib.md5((json_data + self.cursor_secret).encode()).hexdigest()
            data_with_hash = json_data + ":" + data_hash
            
            return base64.urlsafe_b64encode(data_with_hash.encode()).decode()
        except Exception as e:
            logger.error(f"Cursor encoding error: {e}")
            return ""
    
    def decode_cursor(self, cursor: str) -> Optional[Dict[str, Any]]:
        """Decode cursor from base64 string"""
        try:
            decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
            json_data, data_hash = decoded.rsplit(":", 1)
            
            # Verify hash
            expected_hash = hashlib.md5((json_data + self.cursor_secret).encode()).hexdigest()
            if data_hash != expected_hash:
                logger.warning("Invalid cursor hash")
                return None
            
            data = json.loads(json_data)
            return data
        except Exception as e:
            logger.error(f"Cursor decoding error: {e}")
            return None
    
    def create_cursor_based_query(self, base_query: str, params: PaginationParams, 
                                 cursor_field: str = "id") -> Tuple[str, List[Any]]:
        """Create cursor-based query with parameters"""
        query_parts = [base_query]
        query_params = []
        
        # Add cursor condition if provided
        if params.cursor:
            cursor_data = self.decode_cursor(params.cursor)
            if cursor_data and cursor_field in cursor_data:
                if params.sort_order == "desc":
                    query_parts.append(f"AND {cursor_field} < %s")
                else:
                    query_parts.append(f"AND {cursor_field} > %s")
                query_params.append(cursor_data[cursor_field])
        
        # Add sorting
        if params.sort_by:
            query_parts.append(f"ORDER BY {params.sort_by} {params.sort_order.upper()}")
        else:
            query_parts.append(f"ORDER BY {cursor_field} {params.sort_order.upper()}")
        
        # Add limit
        query_parts.append(f"LIMIT %s")
        query_params.append(params.limit + 1)  # +1 to check if there are more results
        
        return " ".join(query_parts), query_params
    
    def create_page_based_query(self, base_query: str, params: PaginationParams) -> Tuple[str, List[Any]]:
        """Create page-based query with parameters"""
        query_parts = [base_query]
        query_params = []
        
        # Add sorting
        if params.sort_by:
            query_parts.append(f"ORDER BY {params.sort_by} {params.sort_order.upper()}")
        else:
            query_parts.append("ORDER BY created_at DESC")
        
        # Add pagination
        query_parts.append("LIMIT %s OFFSET %s")
        query_params.extend([params.limit, params.offset])
        
        return " ".join(query_parts), query_params
    
    def process_cursor_results(self, results: List[Dict[str, Any]], params: PaginationParams,
                             cursor_field: str = "id") -> PaginationResult:
        """Process cursor-based query results"""
        has_next = len(results) > params.limit
        if has_next:
            results = results[:-1]  # Remove the extra item
        
        next_cursor = None
        previous_cursor = None
        
        if results:
            # Create next cursor from last item
            last_item = results[-1]
            if cursor_field in last_item:
                next_cursor = self.encode_cursor({cursor_field: last_item[cursor_field]})
            
            # Create previous cursor from first item
            first_item = results[0]
            if cursor_field in first_item:
                previous_cursor = self.encode_cursor({cursor_field: first_item[cursor_field]})
        
        return PaginationResult(
            items=results,
            total_count=len(results),  # For cursor-based, we don't know total
            page=params.page,
            page_size=params.page_size,
            total_pages=0,  # Not applicable for cursor-based
            has_next=has_next,
            has_previous=params.cursor is not None,
            next_cursor=next_cursor,
            previous_cursor=previous_cursor
        )
    
    def process_page_results(self, results: List[Dict[str, Any]], total_count: int, 
                           params: PaginationParams) -> PaginationResult:
        """Process page-based query results"""
        total_pages = (total_count + params.page_size - 1) // params.page_size
        
        return PaginationResult(
            items=results,
            total_count=total_count,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages,
            has_next=params.page < total_pages,
            has_previous=params.page > 1,
            next_page_url=f"?page={params.page + 1}&page_size={params.page_size}" if params.page < total_pages else None,
            previous_page_url=f"?page={params.page - 1}&page_size={params.page_size}" if params.page > 1 else None
        )

# ============================================================================
# SPECIALIZED PAGINATION FOR DIFFERENT DATA TYPES
# ============================================================================

class MemoryPagination:
    """Pagination for memories/photos"""
    
    def __init__(self, pagination_manager: PaginationManager):
        self.pagination_manager = pagination_manager
    
    def get_memories_paginated(self, family_id: str, params: PaginationParams,
                              filters: Dict[str, Any] = None) -> PaginationResult:
        """Get paginated memories for a family"""
        params = self.pagination_manager.validate_pagination_params(params)
        
        # Build base query
        base_query = "SELECT * FROM memories WHERE family_group_id = %s"
        query_params = [family_id]
        
        # Add filters
        if filters:
            if filters.get('date_from'):
                base_query += " AND date >= %s"
                query_params.append(filters['date_from'])
            
            if filters.get('date_to'):
                base_query += " AND date <= %s"
                query_params.append(filters['date_to'])
            
            if filters.get('memory_type'):
                base_query += " AND memory_type = %s"
                query_params.append(filters['memory_type'])
            
            if filters.get('tags'):
                tag_conditions = []
                for tag in filters['tags']:
                    tag_conditions.append("tags::text ILIKE %s")
                    query_params.append(f'%"{tag}"%')
                if tag_conditions:
                    base_query += f" AND ({' OR '.join(tag_conditions)})"
        
        # Use cursor-based pagination for better performance
        query, final_params = self.pagination_manager.create_cursor_based_query(
            base_query, params, "created_at"
        )
        query_params.extend(final_params)
        
        # Execute query (this would be done with database connection)
        # For now, return mock result
        return self.pagination_manager.process_cursor_results([], params, "created_at")

class AlbumPagination:
    """Pagination for albums"""
    
    def __init__(self, pagination_manager: PaginationManager):
        self.pagination_manager = pagination_manager
    
    def get_albums_paginated(self, family_id: str, params: PaginationParams) -> PaginationResult:
        """Get paginated albums for a family"""
        params = self.pagination_manager.validate_pagination_params(params)
        
        base_query = "SELECT * FROM albums WHERE family_group_id = %s"
        query, query_params = self.pagination_manager.create_cursor_based_query(
            base_query, params, "created_at"
        )
        query_params.insert(0, family_id)
        
        return self.pagination_manager.process_cursor_results([], params, "created_at")

class GameSessionPagination:
    """Pagination for game sessions"""
    
    def __init__(self, pagination_manager: PaginationManager):
        self.pagination_manager = pagination_manager
    
    def get_game_sessions_paginated(self, family_id: str, params: PaginationParams,
                                   status: str = None) -> PaginationResult:
        """Get paginated game sessions for a family"""
        params = self.pagination_manager.validate_pagination_params(params)
        
        base_query = "SELECT * FROM game_sessions WHERE family_group_id = %s"
        query_params = [family_id]
        
        if status:
            base_query += " AND status = %s"
            query_params.append(status)
        
        query, final_params = self.pagination_manager.create_cursor_based_query(
            base_query, params, "created_at"
        )
        query_params.extend(final_params)
        
        return self.pagination_manager.process_cursor_results([], params, "created_at")

class FamilyMemberPagination:
    """Pagination for family members"""
    
    def __init__(self, pagination_manager: PaginationManager):
        self.pagination_manager = pagination_manager
    
    def get_family_members_paginated(self, family_id: str, params: PaginationParams) -> PaginationResult:
        """Get paginated family members"""
        params = self.pagination_manager.validate_pagination_params(params)
        
        base_query = "SELECT * FROM family_members WHERE family_group_id = %s"
        query, query_params = self.pagination_manager.create_page_based_query(
            base_query, params
        )
        query_params.insert(0, family_id)
        
        # For family members, we can use page-based pagination since the dataset is smaller
        return self.pagination_manager.process_page_results([], 0, params)

# ============================================================================
# PAGINATION INTEGRATION WITH DATABASE
# ============================================================================

class DatabasePagination:
    """Database integration for pagination"""
    
    def __init__(self, database_connection, pagination_manager: PaginationManager):
        self.db = database_connection
        self.pagination_manager = pagination_manager
    
    async def get_memories_with_pagination(self, family_id: str, params: PaginationParams,
                                         filters: Dict[str, Any] = None) -> PaginationResult:
        """Get memories with pagination from database"""
        params = self.pagination_manager.validate_pagination_params(params)
        
        # Build query
        base_query = "SELECT * FROM memories WHERE family_group_id = %s"
        query_params = [family_id]
        
        # Add filters
        if filters:
            if filters.get('date_from'):
                base_query += " AND date >= %s"
                query_params.append(filters['date_from'])
            
            if filters.get('date_to'):
                base_query += " AND date <= %s"
                query_params.append(filters['date_to'])
        
        # Use cursor-based pagination
        query, final_params = self.pagination_manager.create_cursor_based_query(
            base_query, params, "created_at"
        )
        query_params.extend(final_params)
        
        # Execute query
        try:
            with self.db.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, query_params)
                    results = cur.fetchall()
                    
                    # Convert to list of dicts
                    columns = [desc[0] for desc in cur.description]
                    items = [dict(zip(columns, row)) for row in results]
                    
                    return self.pagination_manager.process_cursor_results(items, params, "created_at")
        except Exception as e:
            logger.error(f"Database pagination error: {e}")
            return PaginationResult(
                items=[], total_count=0, page=params.page, page_size=params.page_size,
                total_pages=0, has_next=False, has_previous=False
            )

# ============================================================================
# PAGINATION UTILITIES
# ============================================================================

def create_pagination_links(base_url: str, result: PaginationResult) -> Dict[str, str]:
    """Create pagination links for API responses"""
    links = {}
    
    if result.has_next:
        if result.next_cursor:
            links["next"] = f"{base_url}?cursor={result.next_cursor}"
        elif result.next_page_url:
            links["next"] = f"{base_url}{result.next_page_url}"
    
    if result.has_previous:
        if result.previous_cursor:
            links["previous"] = f"{base_url}?cursor={result.previous_cursor}"
        elif result.previous_page_url:
            links["previous"] = f"{base_url}{result.previous_page_url}"
    
    links["self"] = base_url
    
    return links

def format_paginated_response(result: PaginationResult, base_url: str) -> Dict[str, Any]:
    """Format paginated response for API"""
    return {
        "data": result.items,
        "pagination": {
            "page": result.page,
            "page_size": result.page_size,
            "total_count": result.total_count,
            "total_pages": result.total_pages,
            "has_next": result.has_next,
            "has_previous": result.has_previous,
            "next_cursor": result.next_cursor,
            "previous_cursor": result.previous_cursor
        },
        "links": create_pagination_links(base_url, result)
    }

# ============================================================================
# GLOBAL PAGINATION MANAGER
# ============================================================================

_pagination_manager = None

def get_pagination_manager() -> PaginationManager:
    """Get global pagination manager instance"""
    global _pagination_manager
    if _pagination_manager is None:
        _pagination_manager = PaginationManager()
    return _pagination_manager

# Export components
__all__ = [
    'PaginationManager',
    'PaginationParams',
    'PaginationResult',
    'MemoryPagination',
    'AlbumPagination',
    'GameSessionPagination',
    'FamilyMemberPagination',
    'DatabasePagination',
    'create_pagination_links',
    'format_paginated_response',
    'get_pagination_manager'
] 