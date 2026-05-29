import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BacktestSeries } from '../types/api'

interface Props {
  series: BacktestSeries
}

function sampleData(series: BacktestSeries, maxPoints = 120) {
  const len = series.dates.length
  if (len <= maxPoints) {
    return series.dates.map((date, i) => ({
      date,
      dcaAssets: series.dcaAssets[i],
      lumpSumAssets: series.lumpSumAssets[i],
      nav: series.nav[i],
      returnRate: series.returnRates[i],
    }))
  }
  const step = Math.ceil(len / maxPoints)
  const rows = []
  for (let i = 0; i < len; i += step) {
    rows.push({
      date: series.dates[i],
      dcaAssets: series.dcaAssets[i],
      lumpSumAssets: series.lumpSumAssets[i],
      nav: series.nav[i],
      returnRate: series.returnRates[i],
    })
  }
  const last = len - 1
  if (rows[rows.length - 1]?.date !== series.dates[last]) {
    rows.push({
      date: series.dates[last],
      dcaAssets: series.dcaAssets[last],
      lumpSumAssets: series.lumpSumAssets[last],
      nav: series.nav[last],
      returnRate: series.returnRates[last],
    })
  }
  return rows
}

export function BacktestCharts({ series }: Props) {
  const data = sampleData(series)

  if (data.length === 0) {
    return (
      <div className="panel chart-panel empty-chart">
        <p>暂无图表数据</p>
      </div>
    )
  }

  return (
    <div className="charts-grid">
      <div className="panel chart-panel">
        <h3>资产曲线（元）</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              minTickGap={40}
              tickFormatter={(v) => String(v).slice(2)}
            />
            <YAxis tick={{ fontSize: 11 }} width={56} />
            <Tooltip
              labelFormatter={(l) => `日期 ${l}`}
              formatter={(value, name) => [
                Number(value ?? 0).toLocaleString('zh-CN'),
                String(name),
              ]}
            />
            <Legend wrapperStyle={{ width: '100%' }} />
            <Line
              type="monotone"
              dataKey="dcaAssets"
              name="定投资产"
              stroke="var(--accent-dca)"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="lumpSumAssets"
              name="一次性买入资产"
              stroke="var(--accent-lump)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel chart-panel">
        <h3>基金净值 & 定投收益率</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              minTickGap={40}
              tickFormatter={(v) => String(v).slice(2)}
            />
            <YAxis yAxisId="nav" tick={{ fontSize: 11 }} width={48} />
            <YAxis
              yAxisId="ret"
              orientation="right"
              tick={{ fontSize: 11 }}
              width={48}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              labelFormatter={(l) => `日期 ${l}`}
              formatter={(value, name) => {
                const n = Number(value ?? 0)
                const label = String(name)
                if (label === '定投收益率') return [`${n}%`, label]
                return [n.toFixed(4), label]
              }}
            />
            <Legend wrapperStyle={{ width: '100%' }} />
            <Line
              yAxisId="nav"
              type="monotone"
              dataKey="nav"
              name="基金净值"
              stroke="var(--accent-nav)"
              dot={false}
              strokeWidth={2}
            />
            <Line
              yAxisId="ret"
              type="monotone"
              dataKey="returnRate"
              name="定投收益率"
              stroke="var(--accent-return)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
