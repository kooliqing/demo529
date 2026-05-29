from datetime import date

import pytest

from app.errors import AppError
from app.models import BacktestRequest, ChartPoint, NavPoint
from app.services.backtest import (
    _generate_schedule,
    _max_drawdown,
    _next_nav_on_or_after,
    run_backtest,
)
from app.storage import fund_store


SAMPLE_NAV = [
    NavPoint(date="2024-01-02", nav=1.0, accNav=1.0, source="test", updatedAt="t"),
    NavPoint(date="2024-01-03", nav=1.1, accNav=1.1, source="test", updatedAt="t"),
    NavPoint(date="2024-01-08", nav=1.2, accNav=1.2, source="test", updatedAt="t"),
    NavPoint(date="2024-01-15", nav=0.9, accNav=0.9, source="test", updatedAt="t"),
    NavPoint(date="2024-01-22", nav=1.0, accNav=1.0, source="test", updatedAt="t"),
]


def test_weekly_schedule():
    s = _generate_schedule("weekly", date(2024, 1, 1), date(2024, 1, 22))
    assert s[0] == date(2024, 1, 1)
    assert len(s) == 4


def test_next_nav_defer_non_trading_day():
    dates = [r.date for r in SAMPLE_NAV]
    nav_map = {r.date: r.nav for r in SAMPLE_NAV}
    # 2024-01-01 无净值，应顺延到 2024-01-02
    trade = _next_nav_on_or_after(dates, nav_map, date(2024, 1, 1), date(2024, 1, 31))
    assert trade == ("2024-01-02", 1.0)


def test_max_drawdown_negative():
    curve = [
        ChartPoint(date="d1", value=100),
        ChartPoint(date="d2", value=120),
        ChartPoint(date="d3", value=90),
    ]
    dd = _max_drawdown(curve)
    assert dd == pytest.approx(-0.25, rel=1e-6)


def test_run_backtest_with_fixture(monkeypatch, tmp_path):
    monkeypatch.setattr(fund_store, "DATA_DIR", tmp_path)
    monkeypatch.setattr(fund_store, "META_FILE", tmp_path / "meta.json")
    fund_store.save_fund_file(
        "005827",
        [r.model_dump() for r in SAMPLE_NAV],
        source="test",
    )

    req = BacktestRequest(
        fundCode="005827",
        amount=1000,
        frequency="weekly",
        startDate="2024-01-01",
        endDate="2024-01-22",
    )
    result = run_backtest(req)
    assert result.dca.totalInvestment == 4000
    assert len(result.transactions) == 4
    assert result.charts["dcaAsset"]
    assert result.charts["lumpSumAsset"]
    assert result.charts["nav"]
    assert result.charts["returnRate"]
    assert result.dca.maxDrawdown <= 0


def test_invalid_date_range():
    with pytest.raises(AppError) as exc:
        run_backtest(
            BacktestRequest(
                fundCode="005827",
                amount=100,
                frequency="monthly",
                startDate="2024-02-01",
                endDate="2024-01-01",
            )
        )
    assert exc.value.code == "INVALID_DATE_RANGE"
