# Enhanced Elmowafiplatform Test Script
# This script tests all the new features we've implemented

Write-Host "🧪 Testing Enhanced Elmowafiplatform Features..." -ForegroundColor Green

# Function to test HTTP endpoints
function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $Description - $Url" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $Description - $Url (Status: $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $Description - $Url (Error: $($_.Exception.Message))" -ForegroundColor Red
        return $false
    }
}

# Function to test GraphQL
function Test-GraphQL {
    try {
        $query = @{
            query = "query { health { status timestamp } }"
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/graphql" -Method POST -Body $query -ContentType "application/json" -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            $result = $response.Content | ConvertFrom-Json
            if ($result.data.health.status -eq "healthy") {
                Write-Host "✅ GraphQL API - Working correctly" -ForegroundColor Green
                return $true
            } else {
                Write-Host "❌ GraphQL API - Invalid response" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "❌ GraphQL API - HTTP $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ GraphQL API - Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test Service Mesh
function Test-ServiceMesh {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/service-mesh/status" -Method GET -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            $result = $response.Content | ConvertFrom-Json
            if ($result.status -eq "operational") {
                Write-Host "✅ Service Mesh - Operational" -ForegroundColor Green
                return $true
            } else {
                Write-Host "⚠️ Service Mesh - Status: $($result.status)" -ForegroundColor Yellow
                return $true
            }
        } else {
            Write-Host "❌ Service Mesh - HTTP $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Service Mesh - Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check Docker containers
function Test-Containers {
    try {
        $containers = docker-compose -f docker-compose.enhanced.yml ps --format json | ConvertFrom-Json
        
        $running = 0
        $total = $containers.Count
        
        foreach ($container in $containers) {
            if ($container.State -eq "running") {
                $running++
                Write-Host "✅ $($container.Service) - Running" -ForegroundColor Green
            } else {
                Write-Host "❌ $($container.Service) - $($container.State)" -ForegroundColor Red
            }
        }
        
        Write-Host "📊 Container Status: $running/$total running" -ForegroundColor Cyan
        return $running -eq $total
    } catch {
        Write-Host "❌ Could not check containers: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main test execution
Write-Host "`n🔍 Checking Docker containers..." -ForegroundColor Yellow
$containersOk = Test-Containers

if ($containersOk) {
    Write-Host "`n🌐 Testing API endpoints..." -ForegroundColor Yellow
    
    # Test basic endpoints
    $endpoints = @(
        @{Url="http://localhost:8000/api/v1/health"; Description="API v1 Health"},
        @{Url="http://localhost:8000/api/v1/graphql/playground"; Description="GraphQL Playground"},
        @{Url="http://localhost:8500"; Description="Consul UI"},
        @{Url="http://localhost:9090"; Description="Prometheus"},
        @{Url="http://localhost:3000"; Description="Grafana"},
        @{Url="http://localhost:5173"; Description="Frontend"}
    )
    
    $endpointResults = @()
    foreach ($endpoint in $endpoints) {
        $result = Test-Endpoint -Url $endpoint.Url -Description $endpoint.Description
        $endpointResults += $result
    }
    
    # Test GraphQL
    Write-Host "`n🔍 Testing GraphQL..." -ForegroundColor Yellow
    $graphqlOk = Test-GraphQL
    
    # Test Service Mesh
    Write-Host "`n🔍 Testing Service Mesh..." -ForegroundColor Yellow
    $serviceMeshOk = Test-ServiceMesh
    
    # Summary
    Write-Host "`n📊 Test Summary:" -ForegroundColor Cyan
    Write-Host "  Containers: $(if($containersOk){'✅'}{'❌'})" -ForegroundColor $(if($containersOk){'Green'}{'Red'})
    Write-Host "  Endpoints: $(($endpointResults | Where-Object {$_ -eq $true}).Count)/$($endpointResults.Count) ✅" -ForegroundColor $(if(($endpointResults | Where-Object {$_ -eq $true}).Count -eq $endpointResults.Count){'Green'}{'Yellow'})
    Write-Host "  GraphQL: $(if($graphqlOk){'✅'}{'❌'})" -ForegroundColor $(if($graphqlOk){'Green'}{'Red'})
    Write-Host "  Service Mesh: $(if($serviceMeshOk){'✅'}{'❌'})" -ForegroundColor $(if($serviceMeshOk){'Green'}{'Red'})
    
    $allTestsPassed = $containersOk -and ($endpointResults | Where-Object {$_ -eq $true}).Count -eq $endpointResults.Count -and $graphqlOk -and $serviceMeshOk
    
    if ($allTestsPassed) {
        Write-Host "`n🎉 All tests passed! Enhanced system is working correctly." -ForegroundColor Green
        Write-Host "🚀 You can now explore:" -ForegroundColor Cyan
        Write-Host "  • Frontend: http://localhost:5173" -ForegroundColor White
        Write-Host "  • GraphQL Playground: http://localhost:8000/api/v1/graphql/playground" -ForegroundColor White
        Write-Host "  • Service Mesh: http://localhost:8000/api/v1/service-mesh/status" -ForegroundColor White
        Write-Host "  • Monitoring: http://localhost:3000 (admin/admin)" -ForegroundColor White
    } else {
        Write-Host "`n⚠️ Some tests failed. Check the logs for details." -ForegroundColor Yellow
        Write-Host "📋 Run: docker-compose -f docker-compose.enhanced.yml logs -f" -ForegroundColor White
    }
} else {
    Write-Host "`n❌ Docker containers are not running properly." -ForegroundColor Red
    Write-Host "📋 Check Docker Desktop and run: docker-compose -f docker-compose.enhanced.yml up -d" -ForegroundColor White
}

Write-Host "`n📚 For more information, see:" -ForegroundColor Cyan
Write-Host "  • QUICK_START_GUIDE.md" -ForegroundColor White
Write-Host "  • MANUAL_DEPLOYMENT.md" -ForegroundColor White
Write-Host "  • API_ENHANCEMENTS.md" -ForegroundColor White
Write-Host "  • INTEGRATION_LAYER_SOLUTION.md" -ForegroundColor White
