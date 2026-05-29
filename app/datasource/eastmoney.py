"""东方财富/天天基金历史净值数据源（可替换）。"""

from datetime import datetime, timezone

import httpx

from app.config import EASTMONEY_PAGE_SIZE

API_URL = "https://api.fund.eastmoney.com/f10/lsjz"
SOURCE_NAME = "eastmoney"


class EastMoneyClient:
    def __init__(self, timeout: float = 30.0):
        self._headers = {
            "Referer": "https://fundf10.eastmoney.com/",
            "User-Agent": "Mozilla/5.0 (compatible; FundBacktest/1.0)",
        }
        self._timeout = timeout

    async def fetch_all_nav(self, fund_code: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            first = await self._fetch_page(client, fund_code, 1)
            if first.get("ErrCode") != 0:
                raise RuntimeError(first.get("ErrMsg") or "东方财富接口返回错误")

            total = int(first.get("TotalCount") or 0)
            items = list(first.get("Data", {}).get("LSJZList") or [])
            if total <= len(items):
                return self._normalize(items)

            pages = (total + EASTMONEY_PAGE_SIZE - 1) // EASTMONEY_PAGE_SIZE
            for page in range(2, pages + 1):
                resp = await self._fetch_page(client, fund_code, page)
                if resp.get("ErrCode") != 0:
                    raise RuntimeError(resp.get("ErrMsg") or f"拉取第 {page} 页失败")
                items.extend(resp.get("Data", {}).get("LSJZList") or [])

            return self._normalize(items)

    async def _fetch_page(self, client: httpx.AsyncClient, fund_code: str, page: int) -> dict:
        r = await client.get(
            API_URL,
            params={
                "fundCode": fund_code,
                "pageIndex": page,
                "pageSize": EASTMONEY_PAGE_SIZE,
            },
            headers=self._headers,
        )
        r.raise_for_status()
        return r.json()

    def _normalize(self, rows: list[dict]) -> list[dict]:
        now = datetime.now(timezone.utc).isoformat()
        out: list[dict] = []
        for row in rows:
            date = row.get("FSRQ")
            nav_raw = row.get("DWJZ")
            acc_raw = row.get("LJJZ")
            if not date or nav_raw in (None, "", "--"):
                continue
            out.append(
                {
                    "date": date,
                    "nav": float(nav_raw),
                    "accNav": float(acc_raw) if acc_raw not in (None, "", "--") else float(nav_raw),
                    "source": SOURCE_NAME,
                    "updatedAt": now,
                }
            )
        out.sort(key=lambda x: x["date"])
        return out
