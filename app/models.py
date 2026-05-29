from typing import Literal

from pydantic import BaseModel, Field

Frequency = Literal["weekly", "biweekly", "monthly"]


class NavPoint(BaseModel):
    date: str
    nav: float
    accNav: float
    source: str
    updatedAt: str


class FundMeta(BaseModel):
    code: str
    name: str
    category: str
    currency: str
    dataUpdatedAt: str | None = None


class FundFile(BaseModel):
    code: str
    name: str
    category: str
    currency: str
    source: str
    updatedAt: str
    records: list[NavPoint]


class SyncRequest(BaseModel):
    fundCodes: list[str] | None = None


class SyncResultItem(BaseModel):
    code: str
    success: bool
    recordCount: int = 0
    message: str | None = None


class SyncResponse(BaseModel):
    results: list[SyncResultItem]


class BacktestRequest(BaseModel):
    fundCode: str
    amount: float = Field(gt=0)
    frequency: Frequency
    startDate: str
    endDate: str


class StrategyMetrics(BaseModel):
    totalInvestment: float
    endAsset: float
    totalReturn: float
    returnRate: float
    maxDrawdown: float


class Transaction(BaseModel):
    plannedDate: str
    tradeDate: str
    nav: float
    amount: float
    shares: float


class ChartPoint(BaseModel):
    date: str
    value: float


class BacktestResponse(BaseModel):
    fundCode: str
    fundName: str
    startDate: str
    endDate: str
    frequency: Frequency
    amountPerPeriod: float
    dca: StrategyMetrics
    lumpSum: StrategyMetrics
    transactions: list[Transaction]
    charts: dict[str, list[ChartPoint]]
