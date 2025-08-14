#!/usr/bin/env python3
"""
Unified startup script for Railway deployment
Starts both AI service and main backend in the same container
"""

import os
import sys
import time
import signal
import logging
import subprocess
from multiprocessing import Process
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Port configuration
BACKEND_PORT = int(os.environ.get('PORT', 8001))
AI_SERVICE_PORT = int(os.environ.get('AI_SERVICE_PORT', 5000))

class UnifiedServer:
    def __init__(self):
        self.processes = []
        self.backend_process = None
        self.ai_process = None

    def start_ai_service(self):
        """Start the AI Flask service"""
        try:
            logger.info(f"Starting AI service on port {AI_SERVICE_PORT}...")
            ai_dir = Path(__file__).parent / "ai-services"
            os.chdir(ai_dir)
            
            # Set environment for AI service
            ai_env = os.environ.copy()
            ai_env['PORT'] = str(AI_SERVICE_PORT)
            ai_env['FLASK_ENV'] = 'production'
            
            self.ai_process = subprocess.Popen([
                sys.executable, 'app.py'
            ], env=ai_env)
            
            logger.info(f"AI service started with PID {self.ai_process.pid}")
            return self.ai_process
            
        except Exception as e:
            logger.error(f"Failed to start AI service: {e}")
            return None

    def start_backend(self):
        """Start the main FastAPI backend"""
        try:
            logger.info(f"Starting backend service on port {BACKEND_PORT}...")
            backend_dir = Path(__file__).parent / "backend"
            os.chdir(backend_dir)
            
            # Set environment for backend
            backend_env = os.environ.copy()
            backend_env['PORT'] = str(BACKEND_PORT)
            backend_env['AI_SERVICE_URL'] = f'http://localhost:{AI_SERVICE_PORT}'
            
            self.backend_process = subprocess.Popen([
                sys.executable, 'simple_main.py'
            ], env=backend_env)
            
            logger.info(f"Backend service started with PID {self.backend_process.pid}")
            return self.backend_process
            
        except Exception as e:
            logger.error(f"Failed to start backend service: {e}")
            return None

    def wait_for_service(self, port, name, max_retries=30):
        """Wait for service to be ready"""
        import socket
        for i in range(max_retries):
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex(('localhost', port))
                sock.close()
                if result == 0:
                    logger.info(f"{name} service is ready on port {port}")
                    return True
            except:
                pass
            time.sleep(2)
        logger.error(f"{name} service failed to start on port {port}")
        return False

    def stop_services(self):
        """Stop all services gracefully"""
        logger.info("Stopping services...")
        
        if self.ai_process:
            self.ai_process.terminate()
            self.ai_process.wait()
            logger.info("AI service stopped")
            
        if self.backend_process:
            self.backend_process.terminate()
            self.backend_process.wait()
            logger.info("Backend service stopped")

    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop_services()
        sys.exit(0)

    def run(self):
        """Main execution method"""
        # Set up signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        try:
            # Start AI service first
            logger.info("Starting Elmowafiplatform Unified Server...")
            
            ai_proc = self.start_ai_service()
            if not ai_proc:
                logger.error("Failed to start AI service, exiting...")
                return False

            # Wait for AI service to be ready
            if not self.wait_for_service(AI_SERVICE_PORT, "AI"):
                logger.error("AI service failed to start properly")
                return False

            # Start backend service
            backend_proc = self.start_backend()
            if not backend_proc:
                logger.error("Failed to start backend service, exiting...")
                self.stop_services()
                return False

            # Wait for backend service to be ready
            if not self.wait_for_service(BACKEND_PORT, "Backend"):
                logger.error("Backend service failed to start properly")
                self.stop_services()
                return False

            logger.info("🚀 Elmowafiplatform is running!")
            logger.info(f"   - AI Service: http://localhost:{AI_SERVICE_PORT}")
            logger.info(f"   - Backend API: http://localhost:{BACKEND_PORT}")
            logger.info(f"   - Health Check: http://localhost:{BACKEND_PORT}/api/v1/health")

            # Keep the main process alive
            while True:
                # Check if processes are still running
                if self.ai_process and self.ai_process.poll() is not None:
                    logger.error("AI service died, restarting...")
                    self.ai_process = self.start_ai_service()

                if self.backend_process and self.backend_process.poll() is not None:
                    logger.error("Backend service died, restarting...")
                    self.backend_process = self.start_backend()

                time.sleep(5)

        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            self.stop_services()

if __name__ == "__main__":
    server = UnifiedServer()
    success = server.run()
    sys.exit(0 if success else 1)