#!/usr/bin/env python3
"""
GraphQL Endpoint for Elmowafiplatform
Integrates GraphQL with FastAPI for efficient data fetching
"""

import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.graphql import GraphQLApp
from starlette.websockets import WebSocket, WebSocketDisconnect

# Import GraphQL schema
from backend.graphql_schema import schema
from backend.auth import get_current_user

# Setup logging
logger = logging.getLogger(__name__)

# Create GraphQL router
router = APIRouter()

# GraphQL endpoint
@router.post("/graphql")
async def graphql_endpoint(
    request: Request,
    current_user: Optional[Dict] = Depends(get_current_user)
):
    """GraphQL endpoint for queries and mutations"""
    try:
        # Get request body
        body = await request.json()
        query = body.get("query")
        variables = body.get("variables", {})
        operation_name = body.get("operationName")
        
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")
        
        # Add user context
        context = {
            "user": current_user,
            "request": request
        }
        
        # Execute GraphQL query
        result = schema.execute(
            query,
            variable_values=variables,
            operation_name=operation_name,
            context_value=context
        )
        
        # Check for errors
        if result.errors:
            logger.error(f"GraphQL errors: {result.errors}")
            return JSONResponse(
                status_code=400,
                content={
                    "errors": [str(error) for error in result.errors],
                    "data": result.data
                }
            )
        
        return JSONResponse(content={
            "data": result.data,
            "extensions": {
                "api_version": "v1",
                "graphql": True
            }
        })
        
    except Exception as e:
        logger.error(f"GraphQL endpoint error: {e}")
        raise HTTPException(status_code=500, detail="GraphQL execution failed")

# GraphQL WebSocket endpoint for subscriptions
@router.websocket("/graphql/ws")
async def graphql_websocket(websocket: WebSocket):
    """GraphQL WebSocket endpoint for real-time subscriptions"""
    await websocket.accept()
    
    try:
        while True:
            # Receive message
            message = await websocket.receive_text()
            data = json.loads(message)
            
            # Handle different message types
            message_type = data.get("type")
            
            if message_type == "connection_init":
                # Handle connection initialization
                await websocket.send_text(json.dumps({
                    "type": "connection_ack",
                    "payload": {
                        "api_version": "v1",
                        "graphql": True
                    }
                }))
                
            elif message_type == "start":
                # Handle subscription start
                query = data.get("payload", {}).get("query")
                variables = data.get("payload", {}).get("variables", {})
                
                if query:
                    # Execute subscription query
                    result = schema.execute(
                        query,
                        variable_values=variables,
                        context_value={"websocket": websocket}
                    )
                    
                    # Send initial result
                    await websocket.send_text(json.dumps({
                        "type": "data",
                        "id": data.get("id"),
                        "payload": {
                            "data": result.data,
                            "extensions": {
                                "api_version": "v1",
                                "graphql": True
                            }
                        }
                    }))
                    
            elif message_type == "stop":
                # Handle subscription stop
                await websocket.send_text(json.dumps({
                    "type": "complete",
                    "id": data.get("id")
                }))
                
    except WebSocketDisconnect:
        logger.info("GraphQL WebSocket disconnected")
    except Exception as e:
        logger.error(f"GraphQL WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "payload": {"message": str(e)}
            }))
        except:
            pass

# GraphQL Playground endpoint
@router.get("/graphql/playground")
async def graphql_playground():
    """Serve GraphQL Playground for development"""
    playground_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Elmowafiplatform GraphQL Playground</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.42/build/static/css/index.css" />
        <script src="https://cdn.jsdelivr.net/npm/graphql-playground-react@1.7.42/build/static/js/middleware.js"></script>
    </head>
    <body>
        <div id="root"></div>
        <script>
            window.addEventListener('load', function (event) {
                GraphQLPlayground.init(document.getElementById('root'), {
                    endpoint: '/api/v1/graphql',
                    subscriptionEndpoint: 'ws://localhost:8000/api/v1/graphql/ws',
                    settings: {
                        'request.credentials': 'include',
                        'editor.theme': 'dark'
                    }
                })
            })
        </script>
    </body>
    </html>
    """
    return JSONResponse(content=playground_html, media_type="text/html")

# GraphQL schema introspection endpoint
@router.get("/graphql/schema")
async def graphql_schema():
    """Get GraphQL schema introspection"""
    try:
        # Get schema introspection
        introspection_query = """
        query IntrospectionQuery {
            __schema {
                queryType { name }
                mutationType { name }
                subscriptionType { name }
                types {
                    ...FullType
                }
                directives {
                    name
                    description
                    locations
                    args {
                        ...InputValue
                    }
                }
            }
        }
        
        fragment FullType on __Type {
            kind
            name
            description
            fields(includeDeprecated: true) {
                name
                description
                args {
                    ...InputValue
                }
                type {
                    ...TypeRef
                }
                isDeprecated
                deprecationReason
            }
            inputFields {
                ...InputValue
            }
            interfaces {
                ...TypeRef
            }
            enumValues(includeDeprecated: true) {
                name
                description
                isDeprecated
                deprecationReason
            }
            possibleTypes {
                ...TypeRef
            }
        }
        
        fragment InputValue on __InputValue {
            name
            description
            type { ...TypeRef }
            defaultValue
        }
        
        fragment TypeRef on __Type {
            kind
            name
            ofType {
                kind
                name
                ofType {
                    kind
                    name
                    ofType {
                        kind
                        name
                        ofType {
                            kind
                            name
                            ofType {
                                kind
                                name
                                ofType {
                                    kind
                                    name
                                    ofType {
                                        kind
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        """
        
        result = schema.execute(introspection_query)
        
        if result.errors:
            raise HTTPException(status_code=500, detail="Schema introspection failed")
        
        return JSONResponse(content={
            "schema": result.data,
            "api_version": "v1",
            "graphql": True
        })
        
    except Exception as e:
        logger.error(f"Schema introspection error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get schema")

# Health check for GraphQL
@router.get("/graphql/health")
async def graphql_health():
    """Health check for GraphQL endpoint"""
    try:
        # Test a simple query
        test_query = """
        query HealthCheck {
            health
        }
        """
        
        result = schema.execute(test_query)
        
        if result.errors:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "graphql": True,
                    "errors": [str(error) for error in result.errors]
                }
            )
        
        return JSONResponse(content={
            "status": "healthy",
            "graphql": True,
            "api_version": "v1",
            "timestamp": result.data.get("health", {}).get("timestamp")
        })
        
    except Exception as e:
        logger.error(f"GraphQL health check error: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "graphql": True,
                "error": str(e)
            }
        )

# Export router
__all__ = ["router"]
