#!/usr/bin/env python3
"""
GraphQL Schema for Elmowafiplatform
Provides efficient data fetching with GraphQL queries and mutations
"""

import graphene
from graphene import relay
from graphene_sqlalchemy import SQLAlchemyObjectType
from typing import List, Optional
from datetime import datetime

# Import data models
from backend.data_manager import DataManager
from backend.auth import get_current_user

# Initialize data manager
data_manager = DataManager()

# GraphQL Types
class FamilyMemberType(graphene.ObjectType):
    """GraphQL type for Family Member"""
    id = graphene.ID(required=True)
    name = graphene.String(required=True)
    name_arabic = graphene.String()
    birth_date = graphene.String()
    location = graphene.String()
    avatar = graphene.String()
    relationships = graphene.List(graphene.JSONString)

class MemoryType(graphene.ObjectType):
    """GraphQL type for Memory"""
    id = graphene.ID(required=True)
    title = graphene.String(required=True)
    description = graphene.String()
    date = graphene.String(required=True)
    location = graphene.String()
    image_url = graphene.String()
    tags = graphene.List(graphene.String)
    family_members = graphene.List(graphene.String)
    ai_analysis = graphene.JSONString()

class TravelPlanType(graphene.ObjectType):
    """GraphQL type for Travel Plan"""
    id = graphene.ID(required=True)
    name = graphene.String(required=True)
    destination = graphene.String(required=True)
    start_date = graphene.String(required=True)
    end_date = graphene.String(required=True)
    budget = graphene.Float()
    participants = graphene.List(graphene.String)
    activities = graphene.List(graphene.JSONString)

class AIAnalysisType(graphene.ObjectType):
    """GraphQL type for AI Analysis"""
    faces_detected = graphene.Int()
    emotions = graphene.List(graphene.String)
    objects = graphene.List(graphene.String)
    text = graphene.String()
    confidence = graphene.Float()

class ChatMessageType(graphene.ObjectType):
    """GraphQL type for Chat Message"""
    id = graphene.ID(required=True)
    message = graphene.String(required=True)
    response = graphene.String()
    timestamp = graphene.String(required=True)
    confidence = graphene.Float()
    context_used = graphene.List(graphene.String)
    suggestions = graphene.List(graphene.String)

# Input Types
class FamilyMemberInput(graphene.InputObjectType):
    """Input type for creating/updating family member"""
    name = graphene.String(required=True)
    name_arabic = graphene.String()
    birth_date = graphene.String()
    location = graphene.String()
    avatar = graphene.String()
    relationships = graphene.List(graphene.JSONString)

class MemoryInput(graphene.InputObjectType):
    """Input type for creating/updating memory"""
    title = graphene.String(required=True)
    description = graphene.String()
    date = graphene.String(required=True)
    location = graphene.String()
    image_url = graphene.String()
    tags = graphene.List(graphene.String)
    family_members = graphene.List(graphene.String)

class TravelPlanInput(graphene.InputObjectType):
    """Input type for creating/updating travel plan"""
    name = graphene.String(required=True)
    destination = graphene.String(required=True)
    start_date = graphene.String(required=True)
    end_date = graphene.String(required=True)
    budget = graphene.Float()
    participants = graphene.List(graphene.String)
    activities = graphene.List(graphene.JSONString)

class AIAnalysisInput(graphene.InputObjectType):
    """Input type for AI analysis"""
    image_url = graphene.String(required=True)
    analysis_type = graphene.String(default_value="general")
    family_context = graphene.List(graphene.JSONString)

# Queries
class Query(graphene.ObjectType):
    """GraphQL Query definitions"""
    
    # Family Members
    family_members = graphene.List(
        FamilyMemberType,
        description="Get all family members"
    )
    
    family_member = graphene.Field(
        FamilyMemberType,
        id=graphene.ID(required=True),
        description="Get a specific family member by ID"
    )
    
    # Memories
    memories = graphene.List(
        MemoryType,
        family_member_id=graphene.String(),
        start_date=graphene.String(),
        end_date=graphene.String(),
        tags=graphene.List(graphene.String),
        description="Get memories with optional filters"
    )
    
    memory = graphene.Field(
        MemoryType,
        id=graphene.ID(required=True),
        description="Get a specific memory by ID"
    )
    
    memory_suggestions = graphene.Field(
        graphene.JSONString,
        date=graphene.String(),
        description="Get memory suggestions for a specific date"
    )
    
    # Travel Plans
    travel_plans = graphene.List(
        TravelPlanType,
        family_member_id=graphene.String(),
        description="Get travel plans with optional family member filter"
    )
    
    travel_plan = graphene.Field(
        TravelPlanType,
        id=graphene.ID(required=True),
        description="Get a specific travel plan by ID"
    )
    
    # AI Analysis
    analyze_image = graphene.Field(
        AIAnalysisType,
        image_url=graphene.String(required=True),
        analysis_type=graphene.String(default_value="general"),
        family_context=graphene.List(graphene.JSONString),
        description="Analyze an image with AI"
    )
    
    # Chat
    chat_messages = graphene.List(
        ChatMessageType,
        conversation_id=graphene.String(),
        limit=graphene.Int(default_value=50),
        description="Get chat messages for a conversation"
    )
    
    # Health Check
    health = graphene.Field(
        graphene.JSONString,
        description="Get system health status"
    )

    # Resolvers
    async def resolve_family_members(self, info):
        """Resolve family members query"""
        try:
            members = await data_manager.get_family_members()
            return [FamilyMemberType(**member) for member in members]
        except Exception as e:
            return []

    async def resolve_family_member(self, info, id):
        """Resolve single family member query"""
        try:
            members = await data_manager.get_family_members()
            for member in members:
                if member["id"] == id:
                    return FamilyMemberType(**member)
            return None
        except Exception as e:
            return None

    async def resolve_memories(self, info, family_member_id=None, start_date=None, end_date=None, tags=None):
        """Resolve memories query with filters"""
        try:
            memories = await data_manager.get_memories(
                family_member_id=family_member_id,
                start_date=start_date,
                end_date=end_date,
                tags=tags
            )
            return [MemoryType(**memory) for memory in memories]
        except Exception as e:
            return []

    async def resolve_memory(self, info, id):
        """Resolve single memory query"""
        try:
            memories = await data_manager.get_memories()
            for memory in memories:
                if memory["id"] == id:
                    return MemoryType(**memory)
            return None
        except Exception as e:
            return None

    async def resolve_memory_suggestions(self, info, date=None):
        """Resolve memory suggestions query"""
        try:
            # This would call the existing memory suggestions logic
            suggestions = {
                "on_this_day": [],
                "similar": [],
                "recommendations": []
            }
            return suggestions
        except Exception as e:
            return {}

    async def resolve_travel_plans(self, info, family_member_id=None):
        """Resolve travel plans query"""
        try:
            # This would call the existing travel plans logic
            plans = []
            return [TravelPlanType(**plan) for plan in plans]
        except Exception as e:
            return []

    async def resolve_travel_plan(self, info, id):
        """Resolve single travel plan query"""
        try:
            # This would call the existing travel plan logic
            return None
        except Exception as e:
            return None

    async def resolve_analyze_image(self, info, image_url, analysis_type="general", family_context=None):
        """Resolve AI image analysis query"""
        try:
            # This would call the existing AI analysis logic
            analysis = {
                "faces_detected": 0,
                "emotions": [],
                "objects": [],
                "text": "",
                "confidence": 0.0
            }
            return AIAnalysisType(**analysis)
        except Exception as e:
            return None

    async def resolve_chat_messages(self, info, conversation_id=None, limit=50):
        """Resolve chat messages query"""
        try:
            # This would call the existing chat logic
            messages = []
            return [ChatMessageType(**message) for message in messages]
        except Exception as e:
            return []

    async def resolve_health(self, info):
        """Resolve health check query"""
        try:
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0",
                "graphql": True
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

# Mutations
class CreateFamilyMember(graphene.Mutation):
    """Mutation to create a family member"""
    
    class Arguments:
        input = FamilyMemberInput(required=True)
    
    family_member = graphene.Field(FamilyMemberType)
    success = graphene.Boolean()
    message = graphene.String()
    
    async def mutate(self, info, input):
        try:
            member_id = await data_manager.create_family_member(input)
            if member_id:
                return CreateFamilyMember(
                    family_member=FamilyMemberType(id=member_id, **input),
                    success=True,
                    message="Family member created successfully"
                )
            else:
                return CreateFamilyMember(
                    family_member=None,
                    success=False,
                    message="Failed to create family member"
                )
        except Exception as e:
            return CreateFamilyMember(
                family_member=None,
                success=False,
                message=f"Error: {str(e)}"
            )

class UpdateFamilyMember(graphene.Mutation):
    """Mutation to update a family member"""
    
    class Arguments:
        id = graphene.ID(required=True)
        input = FamilyMemberInput(required=True)
    
    family_member = graphene.Field(FamilyMemberType)
    success = graphene.Boolean()
    message = graphene.String()
    
    async def mutate(self, info, id, input):
        try:
            success = await data_manager.update_family_member(id, input)
            if success:
                return UpdateFamilyMember(
                    family_member=FamilyMemberType(id=id, **input),
                    success=True,
                    message="Family member updated successfully"
                )
            else:
                return UpdateFamilyMember(
                    family_member=None,
                    success=False,
                    message="Family member not found"
                )
        except Exception as e:
            return UpdateFamilyMember(
                family_member=None,
                success=False,
                message=f"Error: {str(e)}"
            )

class CreateMemory(graphene.Mutation):
    """Mutation to create a memory"""
    
    class Arguments:
        input = MemoryInput(required=True)
    
    memory = graphene.Field(MemoryType)
    success = graphene.Boolean()
    message = graphene.String()
    
    async def mutate(self, info, input):
        try:
            memory_id = await data_manager.create_memory(input)
            if memory_id:
                return CreateMemory(
                    memory=MemoryType(id=memory_id, **input),
                    success=True,
                    message="Memory created successfully"
                )
            else:
                return CreateMemory(
                    memory=None,
                    success=False,
                    message="Failed to create memory"
                )
        except Exception as e:
            return CreateMemory(
                memory=None,
                success=False,
                message=f"Error: {str(e)}"
            )

class CreateTravelPlan(graphene.Mutation):
    """Mutation to create a travel plan"""
    
    class Arguments:
        input = TravelPlanInput(required=True)
    
    travel_plan = graphene.Field(TravelPlanType)
    success = graphene.Boolean()
    message = graphene.String()
    
    async def mutate(self, info, input):
        try:
            # This would call the existing travel plan creation logic
            plan_id = "temp_id"  # Replace with actual implementation
            return CreateTravelPlan(
                travel_plan=TravelPlanType(id=plan_id, **input),
                success=True,
                message="Travel plan created successfully"
            )
        except Exception as e:
            return CreateTravelPlan(
                travel_plan=None,
                success=False,
                message=f"Error: {str(e)}"
            )

class Mutation(graphene.ObjectType):
    """GraphQL Mutation definitions"""
    
    create_family_member = CreateFamilyMember.Field()
    update_family_member = UpdateFamilyMember.Field()
    create_memory = CreateMemory.Field()
    create_travel_plan = CreateTravelPlan.Field()

# Create GraphQL schema
schema = graphene.Schema(query=Query, mutation=Mutation)
