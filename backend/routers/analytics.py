from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime
from backend.services.analytics import get_dashboard_analytics, get_sankey_flow_data

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/dashboard")
def get_dashboard_data():
    return get_dashboard_analytics()

@router.get("/sankey")
def get_sankey_data(month: Optional[str] = Query(None, description="月份 YYYY-MM")):
    cur_m = month or datetime.now().strftime("%Y-%m")
    return get_sankey_flow_data(cur_m)
