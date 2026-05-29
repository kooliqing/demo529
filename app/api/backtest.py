from fastapi import APIRouter

from app.models import BacktestRequest, BacktestResponse
from app.services.backtest import run_backtest

router = APIRouter(prefix="/api", tags=["backtest"])


@router.post("/backtest", response_model=BacktestResponse)
def backtest(req: BacktestRequest):
    return run_backtest(req)
