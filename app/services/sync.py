from app.config import FUND_CODES
from app.datasource.eastmoney import EastMoneyClient
from app.errors import AppError
from app.models import SyncResponse, SyncResultItem
from app.storage import fund_store


async def sync_funds(codes: list[str] | None = None) -> SyncResponse:
    target = codes or sorted(FUND_CODES)
    invalid = [c for c in target if c not in FUND_CODES]
    if invalid:
        raise AppError("INVALID_FUND", f"无效基金代码: {', '.join(invalid)}", 400)

    client = EastMoneyClient()
    results: list[SyncResultItem] = []

    for code in target:
        try:
            records = await client.fetch_all_nav(code)
            fund_store.save_fund_file(code, records, source="eastmoney")
            results.append(
                SyncResultItem(code=code, success=True, recordCount=len(records))
            )
        except Exception as exc:
            existing = fund_store.load_fund_file(code)
            if existing and existing.records:
                results.append(
                    SyncResultItem(
                        code=code,
                        success=False,
                        recordCount=len(existing.records),
                        message=f"同步失败，已保留本地 {len(existing.records)} 条数据: {exc}",
                    )
                )
            else:
                results.append(
                    SyncResultItem(code=code, success=False, recordCount=0, message=str(exc))
                )

    return SyncResponse(results=results)
