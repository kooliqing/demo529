from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta

from app.config import FUND_CODES, FUND_POOL
from app.errors import AppError
from app.models import (
    BacktestRequest,
    BacktestResponse,
    ChartPoint,
    Frequency,
    NavPoint,
    StrategyMetrics,
    Transaction,
)
from app.storage import fund_store


def _parse_date(s: str) -> date:
    try:
        return date.fromisoformat(s)
    except ValueError as exc:
        raise AppError("INVALID_DATE", f"日期格式无效: {s}，请使用 YYYY-MM-DD") from exc


def _validate_request(req: BacktestRequest) -> tuple[date, date]:
    if req.fundCode not in FUND_CODES:
        raise AppError("INVALID_FUND", f"基金代码 {req.fundCode} 不在固定基金池内", 400)
    if req.amount <= 0:
        raise AppError("INVALID_AMOUNT", "单次定投金额必须大于 0", 400)

    start = _parse_date(req.startDate)
    end = _parse_date(req.endDate)
    if end < start:
        raise AppError("INVALID_DATE_RANGE", "结束日期不能早于开始日期", 400)
    return start, end


def _nav_by_date(records: list[NavPoint]) -> dict[str, float]:
    return {r.date: r.nav for r in records}


def _sorted_dates(records: list[NavPoint]) -> list[str]:
    return sorted(r.date for r in records)


def _next_nav_on_or_after(dates: list[str], nav_map: dict[str, float], on_or_after: date, end: date) -> tuple[str, float] | None:
    target = on_or_after.isoformat()
    end_s = end.isoformat()
    for d in dates:
        if d >= target and d <= end_s:
            return d, nav_map[d]
    return None


def _last_nav_on_or_before(dates: list[str], nav_map: dict[str, float], on_or_before: date) -> tuple[str, float] | None:
    end_s = on_or_before.isoformat()
    candidate: tuple[str, float] | None = None
    for d in dates:
        if d <= end_s:
            candidate = (d, nav_map[d])
        else:
            break
    return candidate


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)


def _generate_schedule(frequency: Frequency, start: date, end: date) -> list[date]:
    out: list[date] = []
    cur = start
    if frequency == "weekly":
        delta = timedelta(days=7)
        while cur <= end:
            out.append(cur)
            cur += delta
    elif frequency == "biweekly":
        delta = timedelta(days=14)
        while cur <= end:
            out.append(cur)
            cur += delta
    else:
        while cur <= end:
            out.append(cur)
            cur = _add_months(cur, 1)
    return out


def _max_drawdown(curve: list[ChartPoint]) -> float:
    if not curve:
        return 0.0
    peak = curve[0].value
    min_dd = 0.0
    for p in curve:
        if p.value > peak:
            peak = p.value
        if peak > 0:
            dd = (p.value - peak) / peak
            if dd < min_dd:
                min_dd = dd
    return min_dd


def run_backtest(req: BacktestRequest) -> BacktestResponse:
    start, end = _validate_request(req)
    records = fund_store.get_nav_records(req.fundCode, start=req.startDate, end=req.endDate)
    if not records:
        raise AppError("NO_DATA_IN_RANGE", "所选日期范围内无净值数据", 404)

    nav_map = _nav_by_date(records)
    all_dates = _sorted_dates(records)

    schedule = _generate_schedule(req.frequency, start, end)
    transactions: list[Transaction] = []
    total_shares = 0.0
    total_invested = 0.0

    for planned in schedule:
        trade = _next_nav_on_or_after(all_dates, nav_map, planned, end)
        if trade is None:
            continue
        trade_date, nav = trade
        shares = req.amount / nav
        total_shares += shares
        total_invested += req.amount
        transactions.append(
            Transaction(
                plannedDate=planned.isoformat(),
                tradeDate=trade_date,
                nav=nav,
                amount=req.amount,
                shares=round(shares, 6),
            )
        )

    if total_invested == 0:
        raise AppError("NO_TRADES", "回测期间内未能完成任何定投扣款", 400)

    end_trade = _last_nav_on_or_before(all_dates, nav_map, end)
    if not end_trade:
        raise AppError("NO_END_NAV", "无法确定结束日净值", 400)
    _, end_nav = end_trade
    dca_end_asset = total_shares * end_nav
    dca_return = dca_end_asset - total_invested
    dca_rate = dca_return / total_invested

    lump_trade = _next_nav_on_or_after(all_dates, nav_map, start, end)
    if not lump_trade:
        raise AppError("NO_LUMP_NAV", "无法确定一次性买入净值日", 400)
    _, lump_nav = lump_trade
    lump_shares = total_invested / lump_nav
    lump_end_asset = lump_shares * end_nav
    lump_return = lump_end_asset - total_invested
    lump_rate = lump_end_asset / total_invested - 1

    # rebuild curves with invested tracking for return series
    dca_curve: list[ChartPoint] = []
    lump_curve: list[ChartPoint] = []
    nav_curve: list[ChartPoint] = []
    return_curve: list[ChartPoint] = []

    running_shares = 0.0
    tx_by_date = {t.tradeDate: t for t in transactions}
    last_nav_val: float | None = None
    start_s = start.isoformat()
    end_s = end.isoformat()

    for d in all_dates:
        if d < start_s or d > end_s:
            continue
        last_nav_val = nav_map[d]
        if d in tx_by_date:
            running_shares += tx_by_date[d].shares
        dca_asset = running_shares * last_nav_val
        lump_asset = lump_shares * last_nav_val
        nav_curve.append(ChartPoint(date=d, value=last_nav_val))
        dca_curve.append(ChartPoint(date=d, value=round(dca_asset, 4)))
        lump_curve.append(ChartPoint(date=d, value=round(lump_asset, 4)))
        if total_invested > 0:
            return_curve.append(ChartPoint(date=d, value=round((dca_asset - total_invested) / total_invested, 6)))

    fund_name = next(f["name"] for f in FUND_POOL if f["code"] == req.fundCode)

    return BacktestResponse(
        fundCode=req.fundCode,
        fundName=fund_name,
        startDate=req.startDate,
        endDate=req.endDate,
        frequency=req.frequency,
        amountPerPeriod=req.amount,
        dca=StrategyMetrics(
            totalInvestment=round(total_invested, 2),
            endAsset=round(dca_end_asset, 2),
            totalReturn=round(dca_return, 2),
            returnRate=round(dca_rate, 6),
            maxDrawdown=round(_max_drawdown(dca_curve), 6),
        ),
        lumpSum=StrategyMetrics(
            totalInvestment=round(total_invested, 2),
            endAsset=round(lump_end_asset, 2),
            totalReturn=round(lump_return, 2),
            returnRate=round(lump_rate, 6),
            maxDrawdown=round(_max_drawdown(lump_curve), 6),
        ),
        transactions=transactions,
        charts={
            "dcaAsset": dca_curve,
            "lumpSumAsset": lump_curve,
            "nav": nav_curve,
            "returnRate": return_curve,
        },
    )
