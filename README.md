# 基金定投回测 Web 工具

首版包含前端回测界面（`frontend/`），对接后端 `GET /api/funds` 与 `POST /api/backtest`。

## 前端快速开始

```bash
cd frontend
cp .env.example .env   # 默认 VITE_USE_MOCK=true
npm install
npm run dev
```

浏览器打开 Vite 提示的本地地址（默认 `http://localhost:5173`）。

### Mock / 真实接口切换

| 模式 | 配置 |
|------|------|
| Mock（默认） | `VITE_USE_MOCK=true`，不依赖后端 |
| 联调后端 | `VITE_USE_MOCK=false`，并确保后端运行在 `http://localhost:3000`（Vite 已将 `/api` 代理到该地址） |

可选：`VITE_API_BASE` 指定 API 根路径（生产部署前后端同域时可留空）。

### 回测请求字段（与后端对齐）

- `fundCode`：基金代码
- `amount`：单次定投金额（元，>0）
- `frequency`：`weekly` \| `biweekly` \| `monthly`（对应每周 / 每双周 / 每月）
- `startDate` / `endDate`：`YYYY-MM-DD`

### 响应字段（前端消费）

- `metrics.dca` / `metrics.lumpSum`：累计投入、期末资产、总收益、收益率、最大回撤
- `series`：`dates`、`dcaAssets`、`lumpSumAssets`、`nav`、`returnRates`
- `transactions`：实际扣款与一次性买入明细

## 构建

```bash
cd frontend && npm run build
```

产物在 `frontend/dist/`。

## 待联调项

- 后端 WS-2 完成后将 `.env` 中 `VITE_USE_MOCK=false` 做端到端验证
- 若后端字段命名与上表不一致，需在 PR 中同步调整 `frontend/src/types/api.ts`
