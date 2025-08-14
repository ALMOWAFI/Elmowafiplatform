"""
Budget System Bridge
Connects the Wasp-based budget system to the main Elmowafiplatform API
"""

import os
import json
import logging
import aiohttp
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import google.generativeai as genai

# Try to import OpenAI
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

class BudgetBridge:
    """Bridge between main platform and budget system"""
    
    def __init__(self, database_url: str = None, gemini_model=None, openai_client=None):
        self.database_url = database_url or os.getenv('BUDGET_DATABASE_URL', 'postgresql://localhost:5432/budget_db')
        self.gemini_model = gemini_model
        self.openai_client = openai_client
        
        # Initialize OpenAI client if not provided
        if OPENAI_AVAILABLE and not self.openai_client and os.environ.get('OPENAI_API_KEY'):
            try:
                self.openai_client = openai.OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
        
    async def get_connection(self):
        """Get database connection to budget system"""
        try:
            conn = psycopg2.connect(self.database_url)
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to budget database: {e}")
            return None
    
    async def get_family_budget_summary(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive budget summary for a family"""
        try:
            conn = await self.get_connection()
            if not conn:
                return self._get_mock_budget_data()
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get user's budget profile
                cur.execute("""
                    SELECT bp.* FROM "BudgetProfile" bp 
                    JOIN "User" u ON bp."ownerId" = u.id 
                    WHERE u.email = %s OR u.id = %s
                    LIMIT 1
                """, (user_id, user_id))
                
                profile = cur.fetchone()
                if not profile:
                    return self._get_mock_budget_data()
                
                # Get envelopes (budget categories)
                cur.execute("""
                    SELECT * FROM "Envelope" 
                    WHERE "budgetProfileId" = %s AND "isArchived" = false
                    ORDER BY name
                """, (profile['id'],))
                
                envelopes = cur.fetchall()
                
                # Get recent transactions
                cur.execute("""
                    SELECT t.*, e.name as envelope_name 
                    FROM "Transaction" t
                    LEFT JOIN "Envelope" e ON t."envelopeId" = e.id
                    WHERE t."budgetProfileId" = %s 
                    ORDER BY t.date DESC 
                    LIMIT 20
                """, (profile['id'],))
                
                transactions = cur.fetchall()
                
                # Calculate totals
                total_budget = sum(float(env['amount']) for env in envelopes)
                total_spent = sum(float(env['spent']) for env in envelopes)
                remaining = total_budget - total_spent
                
                # Format categories
                categories = []
                for env in envelopes:
                    categories.append({
                        "id": env['id'],
                        "name": env['name'],
                        "budgeted": float(env['amount']),
                        "spent": float(env['spent']),
                        "remaining": float(env['amount']) - float(env['spent']),
                        "category": env['category'],
                        "color": env['color'],
                        "icon": env['icon']
                    })
                
                # Format recent transactions
                recent_transactions = []
                for txn in transactions:
                    recent_transactions.append({
                        "id": txn['id'],
                        "description": txn['description'],
                        "amount": float(txn['amount']),
                        "date": txn['date'].isoformat() if txn['date'] else None,
                        "type": txn['type'],
                        "envelope": txn.get('envelope_name', 'Uncategorized')
                    })
                
                budget_data = {
                    "profile_id": profile['id'],
                    "profile_name": profile['name'],
                    "currency": profile['currency'],
                    "total_budget": total_budget,
                    "total_spent": total_spent,
                    "remaining": remaining,
                    "categories": categories,
                    "recent_transactions": recent_transactions[:10],
                    "budget_health": self._calculate_budget_health(total_budget, total_spent),
                    "last_updated": datetime.now().isoformat()
                }
                
                # Add AI insights if available
                if self.gemini_model:
                    budget_data["ai_insights"] = await self._generate_budget_insights(budget_data)
                
                conn.close()
                return budget_data
                
        except Exception as e:
            logger.error(f"Error getting budget summary: {e}")
            return self._get_mock_budget_data()
    
    async def create_budget_envelope(self, user_id: str, envelope_data: Dict) -> Dict[str, Any]:
        """Create new budget envelope/category"""
        try:
            conn = await self.get_connection()
            if not conn:
                return {"error": "Database connection failed"}
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get user's budget profile
                cur.execute("""
                    SELECT bp.id FROM "BudgetProfile" bp 
                    JOIN "User" u ON bp."ownerId" = u.id 
                    WHERE u.email = %s OR u.id = %s
                    LIMIT 1
                """, (user_id, user_id))
                
                profile = cur.fetchone()
                if not profile:
                    return {"error": "Budget profile not found"}
                
                # Create envelope
                cur.execute("""
                    INSERT INTO "Envelope" 
                    (name, "budgetProfileId", amount, category, color, icon, "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                    RETURNING *
                """, (
                    envelope_data.get('name'),
                    profile['id'],
                    envelope_data.get('amount', 0),
                    envelope_data.get('category', 'General'),
                    envelope_data.get('color', '#3B82F6'),
                    envelope_data.get('icon', '💰')
                ))
                
                new_envelope = cur.fetchone()
                conn.commit()
                conn.close()
                
                return {
                    "success": True,
                    "envelope": {
                        "id": new_envelope['id'],
                        "name": new_envelope['name'],
                        "amount": float(new_envelope['amount']),
                        "category": new_envelope['category'],
                        "color": new_envelope['color'],
                        "icon": new_envelope['icon']
                    }
                }
                
        except Exception as e:
            logger.error(f"Error creating envelope: {e}")
            return {"error": "Failed to create envelope"}
    
    async def add_transaction(self, user_id: str, transaction_data: Dict) -> Dict[str, Any]:
        """Add new transaction to budget"""
        try:
            conn = await self.get_connection()
            if not conn:
                return {"error": "Database connection failed"}
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get user's budget profile
                cur.execute("""
                    SELECT bp.id FROM "BudgetProfile" bp 
                    JOIN "User" u ON bp."ownerId" = u.id 
                    WHERE u.email = %s OR u.id = %s
                    LIMIT 1
                """, (user_id, user_id))
                
                profile = cur.fetchone()
                if not profile:
                    return {"error": "Budget profile not found"}
                
                # Create transaction
                cur.execute("""
                    INSERT INTO "Transaction" 
                    (description, amount, date, type, "budgetProfileId", "envelopeId", "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                    RETURNING *
                """, (
                    transaction_data.get('description'),
                    transaction_data.get('amount'),
                    transaction_data.get('date', datetime.now()),
                    transaction_data.get('type', 'EXPENSE'),
                    profile['id'],
                    transaction_data.get('envelope_id')
                ))
                
                new_transaction = cur.fetchone()
                
                # Update envelope spent amount if it's an expense
                if transaction_data.get('type') == 'EXPENSE' and transaction_data.get('envelope_id'):
                    cur.execute("""
                        UPDATE "Envelope" 
                        SET spent = spent + %s, "updatedAt" = NOW()
                        WHERE id = %s
                    """, (transaction_data.get('amount'), transaction_data.get('envelope_id')))
                
                conn.commit()
                conn.close()
                
                return {
                    "success": True,
                    "transaction": {
                        "id": new_transaction['id'],
                        "description": new_transaction['description'],
                        "amount": float(new_transaction['amount']),
                        "date": new_transaction['date'].isoformat(),
                        "type": new_transaction['type']
                    }
                }
                
        except Exception as e:
            logger.error(f"Error adding transaction: {e}")
            return {"error": "Failed to add transaction"}
    
    def _calculate_budget_health(self, total_budget: float, total_spent: float) -> str:
        """Calculate budget health status"""
        if total_budget == 0:
            return "no_budget"
        
        spent_percentage = (total_spent / total_budget) * 100
        
        if spent_percentage < 50:
            return "excellent"
        elif spent_percentage < 75:
            return "good"
        elif spent_percentage < 90:
            return "warning"
        else:
            return "critical"
    
    async def _generate_budget_insights(self, budget_data: Dict) -> str:
        """Generate AI insights for budget data"""
        try:
            # Check if OpenAI is available first, then fall back to Gemini
            if self.openai_client and OPENAI_AVAILABLE:
                prompt = f"""
                Analyze this family budget data and provide 2-3 practical insights:
                
                Total Budget: ${budget_data['total_budget']:.2f}
                Spent: ${budget_data['total_spent']:.2f}
                Remaining: ${budget_data['remaining']:.2f}
                Budget Health: {budget_data['budget_health']}
                
                Top Categories:
                {chr(10).join([f"- {cat['name']}: ${cat['spent']:.2f} spent of ${cat['budgeted']:.2f} budgeted" for cat in budget_data['categories'][:5]])}
                
                Provide brief, actionable insights for a family budget in 2-3 sentences.
                """
                
                # Call OpenAI API
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful financial advisor providing concise budget insights."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=150
                )
                
                # Extract the response text
                if response.choices and len(response.choices) > 0:
                    return response.choices[0].message.content.strip()
                else:
                    return "Unable to generate insights at this time."
                    
            elif self.gemini_model:
                prompt = f"""
                Analyze this family budget data and provide 2-3 practical insights:
                
                Total Budget: ${budget_data['total_budget']:.2f}
                Spent: ${budget_data['total_spent']:.2f}
                Remaining: ${budget_data['remaining']:.2f}
                Budget Health: {budget_data['budget_health']}
                
                Top Categories:
                {chr(10).join([f"- {cat['name']}: ${cat['spent']:.2f} spent of ${cat['budgeted']:.2f} budgeted" for cat in budget_data['categories'][:5]])}
                
                Provide brief, actionable insights for a family budget in 2-3 sentences.
                """
                
                response = self.gemini_model.generate_content(prompt)
                return response.text.strip()
            else:
                return "AI insights unavailable"
            
        except Exception as e:
            logger.error(f"Error generating budget insights: {e}")
            return "Unable to generate insights at this time."
    
    def _get_mock_budget_data(self) -> Dict[str, Any]:
        """Fallback mock data when real budget system is unavailable"""
        return {
            "profile_id": "mock_profile",
            "profile_name": "Family Budget",
            "currency": "USD",
            "total_budget": 5000.0,
            "total_spent": 2800.0,
            "remaining": 2200.0,
            "categories": [
                {"id": 1, "name": "Travel", "budgeted": 2000.0, "spent": 1200.0, "remaining": 800.0, "category": "Travel", "color": "#3B82F6", "icon": "✈️"},
                {"id": 2, "name": "Food", "budgeted": 1500.0, "spent": 800.0, "remaining": 700.0, "category": "Food", "color": "#EF4444", "icon": "🍽️"},
                {"id": 3, "name": "Activities", "budgeted": 1000.0, "spent": 600.0, "remaining": 400.0, "category": "Entertainment", "color": "#10B981", "icon": "🎯"},
                {"id": 4, "name": "Accommodation", "budgeted": 500.0, "spent": 200.0, "remaining": 300.0, "category": "Accommodation", "color": "#F59E0B", "icon": "🏨"}
            ],
            "recent_transactions": [
                {"id": 1, "description": "Flight booking", "amount": 450.0, "date": "2024-01-15", "type": "EXPENSE", "envelope": "Travel"},
                {"id": 2, "description": "Restaurant dinner", "amount": 85.0, "date": "2024-01-14", "type": "EXPENSE", "envelope": "Food"},
                {"id": 3, "description": "Hotel reservation", "amount": 200.0, "date": "2024-01-13", "type": "EXPENSE", "envelope": "Accommodation"}
            ],
            "budget_health": "good",
            "last_updated": datetime.now().isoformat(),
            "ai_insights": "Your family is managing the budget well! Travel spending is on track. Consider setting aside more for activities to maximize family experiences.",
            "is_mock_data": True
        }

# Global instance
budget_bridge = None

def initialize_budget_bridge(database_url: str = None, gemini_model=None, openai_client=None):
    """Initialize the budget bridge"""
    global budget_bridge
    budget_bridge = BudgetBridge(database_url, gemini_model, openai_client)
    return budget_bridge

def get_budget_bridge():
    """Get the budget bridge instance"""
    return budget_bridge