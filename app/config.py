from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data" / "funds"
META_FILE = DATA_DIR / "meta.json"

FUND_POOL: list[dict[str, str]] = [
    {"code": "005827", "name": "易方达蓝筹精选混合A", "category": "混合型", "currency": "CNY"},
    {"code": "161725", "name": "招商中证白酒指数(LOF)A", "category": "指数型", "currency": "CNY"},
    {"code": "003096", "name": "中欧医疗健康混合C", "category": "混合型", "currency": "CNY"},
    {"code": "320007", "name": "诺安成长混合", "category": "混合型", "currency": "CNY"},
    {"code": "260108", "name": "景顺长城新兴成长混合A", "category": "混合型", "currency": "CNY"},
    {"code": "110022", "name": "易方达消费行业股票", "category": "股票型", "currency": "CNY"},
    {"code": "161005", "name": "富国天惠成长混合A/B(LOF)", "category": "混合型", "currency": "CNY"},
    {"code": "001875", "name": "前海开源沪港深优势精选混合A", "category": "混合型", "currency": "CNY"},
    {"code": "001410", "name": "信澳新能源产业股票", "category": "股票型", "currency": "CNY"},
    {"code": "008888", "name": "华夏国证半导体芯片ETF联接A", "category": "指数型", "currency": "CNY"},
    {"code": "012922", "name": "易方达全球成长精选混合(QDII)C", "category": "QDII", "currency": "CNY"},
]

FUND_CODES = {f["code"] for f in FUND_POOL}

EASTMONEY_PAGE_SIZE = 100
