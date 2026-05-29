import json
from datetime import datetime, timezone
from pathlib import Path

from app.config import DATA_DIR, FUND_POOL, META_FILE
from app.errors import AppError
from app.models import FundFile, FundMeta, NavPoint


def _ensure_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def fund_path(code: str) -> Path:
    return DATA_DIR / f"{code}.json"


def load_meta() -> dict[str, FundMeta]:
    _ensure_dir()
    if not META_FILE.exists():
        base = {f["code"]: FundMeta(**f, dataUpdatedAt=None) for f in FUND_POOL}
        save_meta(base)
        return base
    raw = json.loads(META_FILE.read_text(encoding="utf-8"))
    return {k: FundMeta(**v) for k, v in raw.items()}


def save_meta(meta: dict[str, FundMeta]) -> None:
    _ensure_dir()
    META_FILE.write_text(
        json.dumps({k: v.model_dump() for k, v in meta.items()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_fund_file(code: str) -> FundFile | None:
    path = fund_path(code)
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return FundFile(**data)


def save_fund_file(code: str, records: list[dict], source: str) -> FundFile:
    _ensure_dir()
    info = next((f for f in FUND_POOL if f["code"] == code), None)
    if not info:
        raise AppError("INVALID_FUND", f"基金代码 {code} 不在固定基金池内", 400)

    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "code": code,
        "name": info["name"],
        "category": info["category"],
        "currency": info["currency"],
        "source": source,
        "updatedAt": now,
        "records": records,
    }
    path = fund_path(code)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)

    meta = load_meta()
    meta[code] = FundMeta(**info, dataUpdatedAt=now)
    save_meta(meta)
    return FundFile(**payload)


def list_funds() -> list[FundMeta]:
    return list(load_meta().values())


def get_nav_records(code: str, start: str | None = None, end: str | None = None) -> list[NavPoint]:
    f = load_fund_file(code)
    if not f or not f.records:
        raise AppError("NO_DATA", f"基金 {code} 暂无本地净值数据，请先同步", 404)
    records = f.records
    if start:
        records = [r for r in records if r.date >= start]
    if end:
        records = [r for r in records if r.date <= end]
    return records
