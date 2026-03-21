from fastapi import APIRouter
import subprocess
import os
import signal
import psutil
import sys

router = APIRouter()

# Global variable to track the monitor process
monitor_process = None

@router.get("/system/monitor-status")
async def get_monitor_status():
    global monitor_process
    
    is_running = False
    if monitor_process and monitor_process.poll() is None:
        is_running = True
    else:
        # Check if any process is running the script
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['cmdline'] and "app/services/gmail_fetch.py" in " ".join(proc.info['cmdline']):
                    is_running = True
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
    return {"running": is_running}

@router.post("/system/start-monitor")
async def start_monitor():
    global monitor_process
    
    status = await get_monitor_status()
    if status["running"]:
        return {"status": "error", "message": "Email monitor is already running"}

    try:
        monitor_process = subprocess.Popen(
            [sys.executable, "app/services/gmail_fetch.py"],
            cwd=os.getcwd()
        )
        return {"status": "success", "message": "Email monitor started in background", "pid": monitor_process.pid}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/system/stop-monitor")
async def stop_monitor():
    global monitor_process
    
    try:
        stopped = False
        if monitor_process and monitor_process.poll() is None:
            monitor_process.terminate()
            monitor_process.wait(timeout=5)
            stopped = True
            
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['cmdline'] and "app/services/gmail_fetch.py" in " ".join(proc.info['cmdline']):
                    os.kill(proc.info['pid'], signal.SIGTERM)
                    stopped = True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        if stopped:
            return {"status": "success", "message": "Email monitor stopped"}
        else:
            return {"status": "error", "message": "Email monitor was not running"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
