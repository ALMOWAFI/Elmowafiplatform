# MongoDB to PostgreSQL Integration Script
# This PowerShell script automates the integration process

# Set error action preference
$ErrorActionPreference = "Stop"

# Function to log messages
function Log-Message {
    param(
        [string]$Message,
        [string]$Type = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Type] $Message"
    
    # Also append to log file
    "[$timestamp] [$Type] $Message" | Out-File -Append -FilePath "integration.log"
}

# Create log file
if (Test-Path "integration.log") {
    Remove-Item "integration.log"
}
"" | Out-File -FilePath "integration.log"

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Log-Message "Node.js version: $nodeVersion"
} catch {
    Log-Message "Node.js is not installed. Please install Node.js and try again." "ERROR"
    exit 1
}

# Check if Python is installed
try {
    $pythonVersion = python --version
    Log-Message "Python version: $pythonVersion"
} catch {
    Log-Message "Python is not installed. Please install Python and try again." "ERROR"
    exit 1
}

# Step 1: Run the MongoDB to PostgreSQL migration script
Log-Message "Step 1: Running MongoDB to PostgreSQL migration script..."
try {
    Set-Location -Path "elmowafy-travels-oasis\server"
    node migrations/mongodb-to-postgres.js
    Set-Location -Path "..\.."  # Return to root directory
    Log-Message "Migration script completed successfully."
} catch {
    Log-Message "Error running migration script: $_" "ERROR"
    exit 1
}

# Step 2: Update the main backend
Log-Message "Step 2: Updating the main backend..."
try {
    python update_main_backend.py
    Log-Message "Main backend updated successfully."
} catch {
    Log-Message "Error updating main backend: $_" "ERROR"
    exit 1
}

# Step 3: Install required Python packages
Log-Message "Step 3: Installing required Python packages..."
try {
    pip install -r requirements.txt
    Log-Message "Python packages installed successfully."
} catch {
    Log-Message "Error installing Python packages: $_" "ERROR"
    exit 1
}

# Step 4: Test the API integration
Log-Message "Step 4: Testing the API integration..."
try {
    node elmowafy-travels-oasis/test-api-integration.js
    Log-Message "API integration test completed."
} catch {
    Log-Message "Error testing API integration: $_" "ERROR"
    exit 1
}

# Step 5: Start the integrated backend (in a new window)
Log-Message "Step 5: Starting the integrated backend..."
try {
    Start-Process powershell -ArgumentList "-Command cd backend; python main.py"
    Log-Message "Backend started in a new window."
} catch {
    Log-Message "Error starting backend: $_" "ERROR"
    exit 1
}

# Step 6: Start the Node.js server (in a new window)
Log-Message "Step 6: Starting the Node.js server..."
try {
    Start-Process powershell -ArgumentList "-Command cd elmowafy-travels-oasis/server; npm start"
    Log-Message "Node.js server started in a new window."
} catch {
    Log-Message "Error starting Node.js server: $_" "ERROR"
    exit 1
}

# Step 7: Start the React frontend (in a new window)
Log-Message "Step 7: Starting the React frontend..."
try {
    Start-Process powershell -ArgumentList "-Command cd elmowafy-travels-oasis/client; npm start"
    Log-Message "React frontend started in a new window."
} catch {
    Log-Message "Error starting React frontend: $_" "ERROR"
    exit 1
}

Log-Message "Integration process completed successfully!"
Log-Message "The following services are now running:"
Log-Message "- Python FastAPI Backend: http://localhost:8000"
Log-Message "- Node.js Server: http://localhost:3000"
Log-Message "- React Frontend: http://localhost:3000"
Log-Message "Please check the individual terminal windows for any service-specific logs."