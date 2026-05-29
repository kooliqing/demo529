import type { BacktestTransaction } from '../types/api'
import { formatCurrency } from '../utils/format'

interface Props {
  transactions: BacktestTransaction[]
}

export function TransactionList({ transactions }: Props) {
  const dcaRows = transactions.filter((t) => t.type === 'dca')
  const lump = transactions.find((t) => t.type === 'lump_sum')

  return (
    <div className="panel tx-panel">
      <h2 className="panel-title">交易明细</h2>
      <p className="tx-summary">
        实际定投扣款 <strong>{dcaRows.length}</strong> 次
        {lump && (
          <>
            {' '}
            · 一次性买入于 <strong>{lump.date}</strong>，金额{' '}
            {formatCurrency(lump.amount)}
          </>
        )}
      </p>
      <div className="tx-table-wrap">
        <table className="tx-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>金额</th>
              <th>净值</th>
              <th>份额</th>
            </tr>
          </thead>
          <tbody>
            {dcaRows.map((row) => (
              <tr key={`dca-${row.date}`}>
                <td>{row.date}</td>
                <td>定投</td>
                <td>{formatCurrency(row.amount)}</td>
                <td>{row.nav.toFixed(4)}</td>
                <td>{row.shares.toFixed(4)}</td>
              </tr>
            ))}
            {lump && (
              <tr className="lump-row">
                <td>{lump.date}</td>
                <td>一次性买入</td>
                <td>{formatCurrency(lump.amount)}</td>
                <td>{lump.nav.toFixed(4)}</td>
                <td>{lump.shares.toFixed(4)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
