import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import init_db, get_db
from backend.services.demo_data import seed_demo_data
from backend.services.recurring_service import execute_pending_recurring_rules

# Import routers
from backend.routers import (
    accounts,
    transactions,
    parser,
    budgets,
    investments,
    debts,
    goals,
    analytics,
    system
)

app = FastAPI(
    title="极智全域个人资产与财务管理系统 (SmartWealth Pro)",
    description="面面俱到、全资产聚合、智能短信/通知识别、防放弃零摩擦记账平台",
    version="1.0.0"
)

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(parser.router)
app.include_router(budgets.router)
app.include_router(investments.router)
app.include_router(debts.router)
app.include_router(goals.router)
app.include_router(analytics.router)
app.include_router(system.router)

@app.on_event("startup")
def on_startup():
    init_db()
    # Check if empty, seed demo data if brand new
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM accounts")
        row = cursor.fetchone()
        if row["count"] == 0:
            print("初始化数据库并载入演示数据...")
            seed_demo_data()
            
    # Check pending recurring items
    try:
        execute_pending_recurring_rules()
    except Exception as e:
        print(f"执行周期记账检查: {e}")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "SmartWealth Pro", "version": "1.0.0"}

# Static build serving if frontend dist exists
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
