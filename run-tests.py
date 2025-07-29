#!/usr/bin/env python3
"""
Comprehensive Test Runner for Elmowafiplatform
Runs both backend (FastAPI) and frontend (React) tests with detailed reporting
"""

import os
import sys
import subprocess
import time
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import argparse

class TestRunner:
    """Comprehensive test runner for the entire platform"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_path = self.project_root / "elmowafiplatform-api"
        self.frontend_path = self.project_root / "elmowafy-travels-oasis"
        self.test_results = {
            "start_time": datetime.now().isoformat(),
            "backend_tests": {},
            "frontend_tests": {},
            "summary": {}
        }
    
    def print_header(self, title: str):
        """Print formatted header"""
        print("\n" + "=" * 80)
        print(f"🧪 {title}")
        print("=" * 80)
    
    def print_section(self, title: str):
        """Print formatted section"""
        print(f"\n📋 {title}")
        print("-" * 60)
    
    def run_backend_tests(self) -> bool:
        """Run FastAPI backend tests"""
        self.print_header("BACKEND API TESTS")
        
        if not (self.backend_path / "test_platform.py").exists():
            print("❌ Backend test file not found!")
            self.test_results["backend_tests"]["error"] = "Test file not found"
            return False
        
        print(f"📂 Backend path: {self.backend_path}")
        
        try:
            # Change to backend directory
            os.chdir(self.backend_path)
            
            # Check dependencies
            self.print_section("Checking Backend Dependencies")
            result = subprocess.run([
                sys.executable, "-m", "pip", "list", "--format=json"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                installed_packages = json.loads(result.stdout)
                package_names = {pkg["name"].lower() for pkg in installed_packages}
                
                required_packages = {
                    "fastapi", "uvicorn", "pytest", "requests", 
                    "pillow", "opencv-python", "sqlite3"
                }
                
                missing_packages = []
                for pkg in required_packages:
                    if pkg not in package_names and pkg != "sqlite3":  # sqlite3 is built-in
                        missing_packages.append(pkg)
                
                if missing_packages:
                    print(f"⚠️  Missing packages: {', '.join(missing_packages)}")
                    print("Installing missing packages...")
                    
                    for pkg in missing_packages:
                        if pkg == "opencv-python":
                            # OpenCV might need special handling
                            subprocess.run([sys.executable, "-m", "pip", "install", "opencv-python-headless"])
                        else:
                            subprocess.run([sys.executable, "-m", "pip", "install", pkg])
                
                print("✅ Backend dependencies checked")
            
            # Run backend tests
            self.print_section("Running Backend Tests")
            start_time = time.time()
            
            # Run the test file directly
            result = subprocess.run([
                sys.executable, "test_platform.py"
            ], capture_output=True, text=True, timeout=300)  # 5 minute timeout
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Store results
            self.test_results["backend_tests"] = {
                "success": result.returncode == 0,
                "duration": duration,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode
            }
            
            # Print results
            if result.returncode == 0:
                print("✅ Backend tests passed!")
                print(f"⏱️  Duration: {duration:.2f} seconds")
                if result.stdout:
                    print("\nTest Output:")
                    print(result.stdout)
            else:
                print("❌ Backend tests failed!")
                print(f"⏱️  Duration: {duration:.2f} seconds")
                if result.stderr:
                    print("\nError Output:")
                    print(result.stderr)
                if result.stdout:
                    print("\nStandard Output:")
                    print(result.stdout)
            
            return result.returncode == 0
            
        except subprocess.TimeoutExpired:
            print("❌ Backend tests timed out!")
            self.test_results["backend_tests"]["error"] = "Tests timed out"
            return False
        except Exception as e:
            print(f"❌ Error running backend tests: {e}")
            self.test_results["backend_tests"]["error"] = str(e)
            return False
        finally:
            # Return to project root
            os.chdir(self.project_root)
    
    def run_frontend_tests(self) -> bool:
        """Run React frontend tests"""
        self.print_header("FRONTEND REACT TESTS")
        
        if not self.frontend_path.exists():
            print("❌ Frontend directory not found!")
            self.test_results["frontend_tests"]["error"] = "Frontend directory not found"
            return False
        
        print(f"📂 Frontend path: {self.frontend_path}")
        
        try:
            # Change to frontend directory
            os.chdir(self.frontend_path)
            
            # Check if node_modules exists
            if not (self.frontend_path / "node_modules").exists():
                self.print_section("Installing Frontend Dependencies")
                print("📦 Installing npm dependencies...")
                
                result = subprocess.run(["npm", "install"], capture_output=True, text=True)
                if result.returncode != 0:
                    print("❌ Failed to install npm dependencies!")
                    print(result.stderr)
                    return False
                print("✅ Frontend dependencies installed")
            
            # Install testing dependencies if needed
            self.print_section("Checking Test Dependencies")
            test_deps = [
                "@testing-library/react",
                "@testing-library/jest-dom", 
                "@testing-library/user-event",
                "jest",
                "ts-jest",
                "@types/jest"
            ]
            
            # Check package.json for test dependencies
            package_json_path = self.frontend_path / "package.json"
            if package_json_path.exists():
                with open(package_json_path) as f:
                    package_data = json.load(f)
                
                all_deps = {
                    **package_data.get("dependencies", {}),
                    **package_data.get("devDependencies", {})
                }
                
                missing_deps = [dep for dep in test_deps if dep not in all_deps]
                
                if missing_deps:
                    print(f"Installing missing test dependencies: {', '.join(missing_deps)}")
                    result = subprocess.run(
                        ["npm", "install", "--save-dev"] + missing_deps,
                        capture_output=True, text=True
                    )
                    if result.returncode != 0:
                        print("⚠️  Warning: Could not install some test dependencies")
                        print(result.stderr)
            
            print("✅ Test dependencies checked")
            
            # Run frontend tests
            self.print_section("Running Frontend Tests")
            start_time = time.time()
            
            # Check if we have a test script or Jest config
            test_command = ["npm", "test"]
            if (self.frontend_path / "jest.config.js").exists():
                test_command = ["npx", "jest", "--config=jest.config.js", "--passWithNoTests"]
            else:
                # Use Vite test if available
                test_command = ["npm", "run", "test"]
            
            # Set environment variables for testing
            env = os.environ.copy()
            env["CI"] = "true"  # Prevent interactive mode
            env["NODE_ENV"] = "test"
            
            result = subprocess.run(
                test_command,
                capture_output=True, 
                text=True, 
                timeout=300,  # 5 minute timeout
                env=env
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Store results
            self.test_results["frontend_tests"] = {
                "success": result.returncode == 0,
                "duration": duration,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode
            }
            
            # Print results
            if result.returncode == 0:
                print("✅ Frontend tests passed!")
                print(f"⏱️  Duration: {duration:.2f} seconds")
                if result.stdout:
                    print("\nTest Output:")
                    print(result.stdout)
            else:
                print("❌ Frontend tests failed or no tests found!")
                print(f"⏱️  Duration: {duration:.2f} seconds")
                if result.stderr:
                    print("\nError Output:")
                    print(result.stderr)
                if result.stdout:
                    print("\nStandard Output:")
                    print(result.stdout)
            
            return result.returncode == 0
            
        except subprocess.TimeoutExpired:
            print("❌ Frontend tests timed out!")
            self.test_results["frontend_tests"]["error"] = "Tests timed out"
            return False
        except FileNotFoundError:
            print("❌ npm/node not found! Please install Node.js")
            self.test_results["frontend_tests"]["error"] = "npm/node not found"
            return False
        except Exception as e:
            print(f"❌ Error running frontend tests: {e}")
            self.test_results["frontend_tests"]["error"] = str(e)
            return False
        finally:
            # Return to project root
            os.chdir(self.project_root)
    
    def run_integration_tests(self) -> bool:
        """Run integration tests between frontend and backend"""
        self.print_header("INTEGRATION TESTS")
        
        # Start backend server
        self.print_section("Starting Backend Server")
        
        try:
            os.chdir(self.backend_path)
            
            # Start the API server in background
            backend_process = subprocess.Popen([
                sys.executable, "start.py"
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Wait a bit for server to start
            time.sleep(5)
            
            # Check if server is responding
            import requests
            try:
                response = requests.get("http://localhost:8000/api/health", timeout=10)
                if response.status_code == 200:
                    print("✅ Backend server is running")
                    
                    # Run integration tests here
                    # For now, just check basic endpoints
                    endpoints_to_test = [
                        "/api/health",
                        "/api/health/system",
                    ]
                    
                    all_passed = True
                    for endpoint in endpoints_to_test:
                        try:
                            resp = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
                            if resp.status_code == 200:
                                print(f"✅ {endpoint} - OK")
                            else:
                                print(f"❌ {endpoint} - Failed ({resp.status_code})")
                                all_passed = False
                        except Exception as e:
                            print(f"❌ {endpoint} - Error: {e}")
                            all_passed = False
                    
                    return all_passed
                else:
                    print(f"❌ Backend health check failed: {response.status_code}")
                    return False
                    
            except requests.RequestException as e:
                print(f"❌ Cannot connect to backend server: {e}")
                return False
            
        except Exception as e:
            print(f"❌ Error running integration tests: {e}")
            return False
        finally:
            # Clean up backend process
            try:
                backend_process.terminate()
                backend_process.wait(timeout=10)
            except:
                try:
                    backend_process.kill()
                except:
                    pass
            os.chdir(self.project_root)
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        self.print_header("TEST SUMMARY REPORT")
        
        # Calculate summary
        backend_success = self.test_results["backend_tests"].get("success", False)
        frontend_success = self.test_results["frontend_tests"].get("success", False)
        
        backend_duration = self.test_results["backend_tests"].get("duration", 0)
        frontend_duration = self.test_results["frontend_tests"].get("duration", 0)
        
        total_duration = backend_duration + frontend_duration
        
        self.test_results["summary"] = {
            "backend_passed": backend_success,
            "frontend_passed": frontend_success,
            "all_passed": backend_success and frontend_success,
            "total_duration": total_duration,
            "end_time": datetime.now().isoformat()
        }
        
        # Print summary
        print(f"📊 Test Results:")
        print(f"   Backend Tests:  {'✅ PASSED' if backend_success else '❌ FAILED'}")
        print(f"   Frontend Tests: {'✅ PASSED' if frontend_success else '❌ FAILED'}")
        print(f"   Total Duration: {total_duration:.2f} seconds")
        
        if backend_success and frontend_success:
            print("\n🎉 ALL TESTS PASSED! Platform is ready for deployment!")
        else:
            print("\n🚨 SOME TESTS FAILED! Please fix issues before deployment.")
        
        # Save detailed report
        report_file = self.project_root / "test-report.json"
        with open(report_file, "w") as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"\n📄 Detailed test report saved to: {report_file}")
        
        return backend_success and frontend_success
    
    def run_all_tests(self, include_integration: bool = False) -> bool:
        """Run all tests"""
        self.print_header(f"ELMOWAFIPLATFORM TEST SUITE")
        print(f"🚀 Starting comprehensive testing at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run backend tests
        backend_passed = self.run_backend_tests()
        
        # Run frontend tests
        frontend_passed = self.run_frontend_tests()
        
        # Run integration tests if requested
        integration_passed = True
        if include_integration:
            integration_passed = self.run_integration_tests()
        
        # Generate report
        all_passed = self.generate_test_report()
        
        return all_passed and integration_passed


def main():
    """Main test runner entry point"""
    parser = argparse.ArgumentParser(description="Elmowafiplatform Test Runner")
    parser.add_argument("--backend-only", action="store_true", help="Run only backend tests")
    parser.add_argument("--frontend-only", action="store_true", help="Run only frontend tests")
    parser.add_argument("--integration", action="store_true", help="Include integration tests")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    runner = TestRunner()
    
    try:
        if args.backend_only:
            success = runner.run_backend_tests()
        elif args.frontend_only:
            success = runner.run_frontend_tests()
        else:
            success = runner.run_all_tests(include_integration=args.integration)
        
        exit_code = 0 if success else 1
        sys.exit(exit_code)
        
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 