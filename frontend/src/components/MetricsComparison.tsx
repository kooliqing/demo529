import type { BacktestMetrics } from '../types/api'
import { formatCurrency, formatPercent } from '../utils/format'

interface Props {
  metrics: BacktestMetrics
}

const ROWS: { key: keyof BacktestMetrics['dca']; label: string; format: 'money' | 'pct' }[] = [
  { key: 'totalInvested', label: '累计投入', format: 'money' },
  { key: 'endingAssets', label: '期末资产', format: 'money' },
  { key: 'totalReturn', label: '总收益', format: 'money' },
  { key: 'returnRate', label: '收益率', format: 'pct' },
  { key: 'maxDrawdown', label: '最大回撤', format: 'pct' },
]

function formatValue(
  key: keyof BacktestMetrics['dca'],
  value: number,
  format: 'money' | 'pct',
) {
  if (format === 'money') return formatCurrency(value)
  if (key === 'maxDrawdown') return formatPercent(value)
  return formatPercent(value)
}

export function MetricsComparison({ metrics }: Props) {
  return (
    <div className="panel metrics-panel">
      <h2 className="panel-title">策略指标对比</h2>
      <div className="metrics-table-wrap">
        <table className="metrics-table">
          <thead>
            <tr>
              <th scope="col">指标</th>
              <th scope="col" className="col-dca">
                定投策略
              </th>
              <th scope="col" className="col-lump">
                一次性买入
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td className="col-dca">
                  {formatValue(row.key, metrics.dca[row.key], row.format)}
                </td>
                <td className="col-lump">
                  {formatValue(row.key, metrics.lumpSum[row.key], row.format)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
