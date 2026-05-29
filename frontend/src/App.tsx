import { useCallback, useEffect, useState } from 'react'
import { fetchFunds, isMockMode, runBacktest } from './api/client'
import {
  BacktestForm,
  type BacktestFormValues,
} from './components/BacktestForm'
import { BacktestCharts } from './components/BacktestCharts'
import { MetricsComparison } from './components/MetricsComparison'
import { TransactionList } from './components/TransactionList'
import type { BacktestResponse, FundItem } from './types/api'
import { ApiError } from './types/api'
import { formatDateTime } from './utils/format'
import './App.css'

const defaultForm: BacktestFormValues = {
  fundCode: '005827',
  amount: '1000',
  frequency: 'monthly',
  startDate: '2023-01-01',
  endDate: '2025-12-31',
}

function validateForm(values: BacktestFormValues): string | null {
  const amount = Number(values.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return '定投金额必须大于 0'
  }
  if (!values.startDate || !values.endDate) {
    return '请填写开始和结束日期'
  }
  if (values.startDate >= values.endDate) {
    return '开始日期必须早于结束日期'
  }
  if (!values.fundCode) {
    return '请选择基金'
  }
  return null
}

function App() {
  const [funds, setFunds] = useState<FundItem[]>([])
  const [dataUpdatedAt, setDataUpdatedAt] = useState<string | null>(null)
  const [fundsLoading, setFundsLoading] = useState(true)
  const [fundsError, setFundsError] = useState<string | null>(null)

  const [form, setForm] = useState<BacktestFormValues>(defaultForm)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [backtestLoading, setBacktestLoading] = useState(false)
  const [backtestError, setBacktestError] = useState<string | null>(null)
  const [result, setResult] = useState<BacktestResponse | null>(null)

  const loadFunds = useCallback(async () => {
    setFundsLoading(true)
    setFundsError(null)
    try {
      const data = await fetchFunds()
      setFunds(data.funds)
      setDataUpdatedAt(data.dataUpdatedAt)
      if (data.funds.length > 0) {
        setForm((prev) => ({
          ...prev,
          fundCode: data.funds.some((f) => f.code === prev.fundCode)
            ? prev.fundCode
            : data.funds[0].code,
        }))
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : '基金列表加载失败，请稍后重试'
      setFundsError(msg)
      setFunds([])
    } finally {
      setFundsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFunds()
  }, [loadFunds])

  const handleBacktest = async () => {
    const err = validateForm(form)
    if (err) {
      setFieldError(err)
      return
    }
    setFieldError(null)
    setBacktestError(null)
    setBacktestLoading(true)
    try {
      const data = await runBacktest({
        fundCode: form.fundCode,
        amount: Number(form.amount),
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate,
      })
      setResult(data)
    } catch (e) {
      setResult(null)
      setBacktestError(
        e instanceof ApiError ? e.message : '回测失败，请检查参数或稍后重试',
      )
    } finally {
      setBacktestLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Fund DCA Lab</p>
          <h1>基金定投回测</h1>
          <p className="subtitle">
            对比定投与一次性买入策略 · 仅供学习，不构成投资建议
          </p>
        </div>
        <div className="header-meta">
          {isMockMode() && <span className="badge mock-badge">Mock 模式</span>}
          {dataUpdatedAt && !fundsLoading && (
            <span className="meta-line">
              净值更新 {formatDateTime(dataUpdatedAt)}
            </span>
          )}
        </div>
      </header>

      {fundsError && (
        <div className="alert alert-error" role="alert">
          <p>{fundsError}</p>
          <button type="button" onClick={() => void loadFunds()}>
            重试
          </button>
        </div>
      )}

      <main className="layout">
        <aside className="sidebar">
          <BacktestForm
            funds={funds}
            values={form}
            loading={backtestLoading || fundsLoading}
            onChange={setForm}
            onSubmit={() => void handleBacktest()}
            fieldError={fieldError}
          />
        </aside>

        <section className="results" aria-live="polite">
          {backtestLoading && (
            <div className="state-card loading-card">
              <div className="spinner" aria-hidden />
              <p>正在计算回测结果…</p>
            </div>
          )}

          {!backtestLoading && backtestError && (
            <div className="state-card error-card" role="alert">
              <h2>回测未成功</h2>
              <p>{backtestError}</p>
            </div>
          )}

          {!backtestLoading && !backtestError && !result && (
            <div className="state-card empty-card">
              <h2>等待回测</h2>
              <p>配置左侧参数后点击「开始回测」，将在此展示指标与图表。</p>
            </div>
          )}

          {result && !backtestLoading && (
            <>
              <div className="result-header">
                <h2>
                  {result.fundName}
                  <span className="fund-code">{result.fundCode}</span>
                </h2>
                <p>
                  {result.startDate} → {result.endDate}
                </p>
              </div>
              <MetricsComparison metrics={result.metrics} />
              <BacktestCharts series={result.series} />
              <TransactionList transactions={result.transactions} />
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
