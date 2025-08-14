#!/usr/bin/env python3
"""
Simple Budget API endpoints for Elmowafiplatform
"""

import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from enum import Enum

# Data Models
class TransactionType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class Envelope(BaseModel):
    id: Optional[int] = None
    name: str
    amount: float
    spent: float = 0.0
    category: Optional[str] = None
    userId: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class Transaction(BaseModel):
    id: Optional[int] = None
    amount: float
    description: str
    date: datetime
    type: TransactionType
    envelopeId: Optional[int] = None
    userId: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class BudgetProfile(BaseModel):
    id: Optional[int] = None
    name: str
    userId: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

# In-memory storage
envelopes_db = []
transactions_db = []
profiles_db = []

# Budget router
budget_router = APIRouter(prefix="/api/v1/budget", tags=["budget"])

# Initialize with sample data
def init_budget_data():
    global envelopes_db, transactions_db, profiles_db
    
    # Sample profile
    profile = {
        "id": 1,
        "name": "Family Budget",
        "userId": "demo-user-1",
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
    }
    profiles_db.append(profile)
    
    # Sample envelopes
    sample_envelopes = [
        {"id": 1, "name": "Groceries", "amount": 800, "spent": 650, "category": "Essentials", "userId": "demo-user-1"},
        {"id": 2, "name": "Entertainment", "amount": 400, "spent": 320, "category": "Lifestyle", "userId": "demo-user-1"},
        {"id": 3, "name": "Transportation", "amount": 500, "spent": 380, "category": "Essentials", "userId": "demo-user-1"},
        {"id": 4, "name": "Dining Out", "amount": 600, "spent": 520, "category": "Lifestyle", "userId": "demo-user-1"},
        {"id": 5, "name": "Utilities", "amount": 350, "spent": 330, "category": "Housing", "userId": "demo-user-1"},
        {"id": 6, "name": "Savings", "amount": 1000, "spent": 0, "category": "Financial", "userId": "demo-user-1"},
    ]
    
    for env_data in sample_envelopes:
        env_data["createdAt"] = datetime.now()
        env_data["updatedAt"] = datetime.now()
        envelopes_db.append(env_data)
    
    # Sample transactions
    sample_transactions = [
        {"id": 1, "amount": 150, "description": "Weekly groceries", "date": datetime.now(), "type": TransactionType.EXPENSE, "envelopeId": 1, "userId": "demo-user-1"},
        {"id": 2, "amount": 80, "description": "Movie tickets", "date": datetime.now(), "type": TransactionType.EXPENSE, "envelopeId": 2, "userId": "demo-user-1"},
        {"id": 3, "amount": 5000, "description": "Monthly salary", "date": datetime.now(), "type": TransactionType.INCOME, "envelopeId": None, "userId": "demo-user-1"},
    ]
    
    for trans_data in sample_transactions:
        trans_data["createdAt"] = datetime.now()
        trans_data["updatedAt"] = datetime.now()
        transactions_db.append(trans_data)

# Budget Profile endpoints
@budget_router.get("/profiles")
async def get_budget_profiles():
    return {"status": "success", "data": profiles_db}

@budget_router.post("/profiles")
async def create_budget_profile(profile: BudgetProfile):
    profile.id = len(profiles_db) + 1
    profile.createdAt = datetime.now()
    profile.updatedAt = datetime.now()
    profile_dict = profile.dict()
    profiles_db.append(profile_dict)
    return {"status": "success", "data": profile_dict}

# Envelope endpoints
@budget_router.get("/envelopes")
async def get_envelopes():
    return {"status": "success", "data": envelopes_db}

@budget_router.post("/envelopes")
async def create_envelope(envelope: Envelope):
    envelope.id = len(envelopes_db) + 1
    envelope.createdAt = datetime.now()
    envelope.updatedAt = datetime.now()
    envelope_dict = envelope.dict()
    envelopes_db.append(envelope_dict)
    return {"status": "success", "data": envelope_dict}

@budget_router.patch("/envelopes/{envelope_id}")
async def update_envelope(envelope_id: int, envelope: Envelope):
    for i, env in enumerate(envelopes_db):
        if env["id"] == envelope_id:
            envelope.id = envelope_id
            envelope.updatedAt = datetime.now()
            envelope_dict = envelope.dict()
            envelopes_db[i] = envelope_dict
            return {"status": "success", "data": envelope_dict}
    raise HTTPException(status_code=404, detail="Envelope not found")

@budget_router.delete("/envelopes/{envelope_id}")
async def delete_envelope(envelope_id: int):
    for i, env in enumerate(envelopes_db):
        if env["id"] == envelope_id:
            deleted_env = envelopes_db.pop(i)
            return {"status": "success", "message": "Envelope deleted", "data": deleted_env}
    raise HTTPException(status_code=404, detail="Envelope not found")

# Transaction endpoints
@budget_router.get("/transactions")
async def get_transactions():
    return {"status": "success", "data": transactions_db}

@budget_router.post("/transactions")
async def create_transaction(transaction: Transaction):
    transaction.id = len(transactions_db) + 1
    transaction.createdAt = datetime.now()
    transaction.updatedAt = datetime.now()
    transaction_dict = transaction.dict()
    transactions_db.append(transaction_dict)
    
    # Update envelope spent amount if it's an expense
    if transaction.type == TransactionType.EXPENSE and transaction.envelopeId:
        for env in envelopes_db:
            if env["id"] == transaction.envelopeId:
                env["spent"] += transaction.amount
                env["updatedAt"] = datetime.now()
                break
    
    return {"status": "success", "data": transaction_dict}

@budget_router.patch("/transactions/{transaction_id}")
async def update_transaction(transaction_id: int, transaction: Transaction):
    for i, trans in enumerate(transactions_db):
        if trans["id"] == transaction_id:
            transaction.id = transaction_id
            transaction.updatedAt = datetime.now()
            transaction_dict = transaction.dict()
            transactions_db[i] = transaction_dict
            return {"status": "success", "data": transaction_dict}
    raise HTTPException(status_code=404, detail="Transaction not found")

@budget_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int):
    for i, trans in enumerate(transactions_db):
        if trans["id"] == transaction_id:
            deleted_trans = transactions_db.pop(i)
            return {"status": "success", "message": "Transaction deleted", "data": deleted_trans}
    raise HTTPException(status_code=404, detail="Transaction not found")

# Initialize data on import
init_budget_data()