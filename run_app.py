import os
import subprocess
import sys
import time

def run_backend():
    print("Starting FastAPI Backend...")
    subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=os.path.join(os.getcwd(), "backend")
    )

def run_frontend():
    print("Starting Vite Frontend...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=os.getcwd()
    )

if __name__ == "__main__":
    print("=== HiveGuard Startup Script ===")
    run_backend()
    time.sleep(2)
    run_frontend()
    print("Both services started. Press Ctrl+C to terminate.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down HiveGuard...")
        sys.exit(0)
