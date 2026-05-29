import type { FormEvent } from 'react'
import type { FundItem, InvestFrequency } from '../types/api'

const FREQUENCY_OPTIONS: { value: InvestFrequency; label: string }[] = [
  { value: 'weekly', label: '每周' },
  { value: 'biweekly', label: '每双周' },
  { value: 'monthly', label: '每月' },
]

export interface BacktestFormValues {
  fundCode: string
  amount: string
  frequency: InvestFrequency
  startDate: string
  endDate: string
}

interface Props {
  funds: FundItem[]
  values: BacktestFormValues
  loading: boolean
  onChange: (values: BacktestFormValues) => void
  onSubmit: () => void
  fieldError?: string | null
}

export function BacktestForm({
  funds,
  values,
  loading,
  onChange,
  onSubmit,
  fieldError,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  const set = (patch: Partial<BacktestFormValues>) =>
    onChange({ ...values, ...patch })

  return (
    <form className="panel form-panel" onSubmit={handleSubmit} noValidate>
      <h2 className="panel-title">回测参数</h2>

      <label className="field">
        <span>基金</span>
        <select
          value={values.fundCode}
          onChange={(e) => set({ fundCode: e.target.value })}
          required
          disabled={loading || funds.length === 0}
        >
          {funds.length === 0 ? (
            <option value="">加载中…</option>
          ) : (
            funds.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code} · {f.name}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="field">
        <span>定投金额（元）</span>
        <input
          type="number"
          min="0"
          step="100"
          inputMode="decimal"
          value={values.amount}
          onChange={(e) => set({ amount: e.target.value })}
          required
          disabled={loading}
          placeholder="例如 1000"
        />
      </label>

      <fieldset className="field frequency-field">
        <legend>定投频率</legend>
        <div className="frequency-options">
          {FREQUENCY_OPTIONS.map((opt) => (
            <label key={opt.value} className="freq-chip">
              <input
                type="radio"
                name="frequency"
                value={opt.value}
                checked={values.frequency === opt.value}
                onChange={() => set({ frequency: opt.value })}
                disabled={loading}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field-row">
        <label className="field">
          <span>开始日期</span>
          <input
            type="date"
            value={values.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
            required
            disabled={loading}
          />
        </label>
        <label className="field">
          <span>结束日期</span>
          <input
            type="date"
            value={values.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
            required
            disabled={loading}
          />
        </label>
      </div>

      {fieldError && (
        <p className="field-error" role="alert">
          {fieldError}
        </p>
      )}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? '回测计算中…' : '开始回测'}
      </button>
    </form>
  )
}
