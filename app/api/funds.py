from fastapi import APIRouter

from app.models import SyncRequest, SyncResponse
from app.services import sync as sync_service
from app.storage import fund_store

router = APIRouter(prefix="/api/funds", tags=["funds"])


@router.get("")
def list_funds():
    funds = fund_store.list_funds()
    return {
        "funds": [f.model_dump() for f in funds],
        "updatedAt": max((f.dataUpdatedAt for f in funds if f.dataUpdatedAt), default=None),
    }


@router.post("/sync", response_model=SyncResponse)
async def sync_funds(body: SyncRequest | None = None):
    codes = body.fundCodes if body else None
    return await sync_service.sync_funds(codes)


@router.get("/{code}/nav")
def get_nav(code: str, start: str | None = None, end: str | None = None):
    records = fund_store.get_nav_records(code, start=start, end=end)
    f = fund_store.load_fund_file(code)
    return {
        "code": code,
        "name": f.name if f else code,
        "start": start,
        "end": end,
        "count": len(records),
        "records": [r.model_dump() for r in records],
    }
