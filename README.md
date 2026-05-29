# 基金定投回测工具（后端）

Python FastAPI 服务：拉取东方财富历史净值、本地 JSON 存储、定投回测计算。

## 快速开始

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/funds` | 固定 11 支基金池与数据更新时间 |
| POST | `/api/funds/sync` | 拉取并保存历史净值（body 可选 `fundCodes`） |
| GET | `/api/funds/{code}/nav` | 本地净值，支持 `start`/`end` 查询参数 |
| POST | `/api/backtest` | 定投回测 |

回测请求示例：

```json
{
  "fundCode": "005827",
  "amount": 1000,
  "frequency": "weekly",
  "startDate": "2023-01-01",
  "endDate": "2024-12-31"
}
```

`maxDrawdown` 为负数，表示相对历史峰值的回撤比例。

## 数据目录

- `data/funds/meta.json` — 基金元数据
- `data/funds/{code}.json` — 净值序列（`date`, `nav`, `accNav`, `source`, `updatedAt`）

## 测试

```bash
pytest -q
```
