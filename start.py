import sys
import os
import webbrowser
import time
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

def main():
    print("=" * 60)
    print("   极智全域个人资产与财务管理系统 (SmartWealth Pro)")
    print("   Zero-Friction Wealth & Bookkeeping Hub")
    print("=" * 60)
    print("\n[1/3] 正在检查并初始化本地 SQLite 数据库...")

    # Ensure backend database is ready
    sys.path.insert(0, str(ROOT_DIR))
    from backend.database import init_db
    init_db()

    print("[2/3] 正在启动 FastAPI 本地安全服务 (http://127.0.0.1:8000)...")
    
    # Open browser after a short delay
    def open_browser():
        time.sleep(1.2)
        print("[3/3] 正在打开浏览器访问系统主页...")
        webbrowser.open("http://127.0.0.1:8000")

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    main()
