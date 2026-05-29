export type InvestFrequency = 'weekly' | 'biweekly' | 'monthly'

export interface FundItem {
  code: string
  name: string
  category?: string
  currency?: string
  updatedAt?: string
}

export interface FundsResponse {
  funds: FundItem[]
  dataUpdatedAt: string
}

export interface BacktestRequest {
  fundCode: string
  amount: number
  frequency: InvestFrequency
  startDate: string
  endDate: string
}

export interface StrategyMetrics {
  totalInvested: number
  endingAssets: number
  totalReturn: number
  returnRate: number
  maxDrawdown: number
}

export interface BacktestMetrics {
  dca: StrategyMetrics
  lumpSum: StrategyMetrics
}

export interface BacktestSeries {
  dates: string[]
  dcaAssets: number[]
  lumpSumAssets: number[]
  nav: number[]
  returnRates: number[]
}

export interface BacktestTransaction {
  date: string
  amount: number
  nav: number
  shares: number
  type: 'dca' | 'lump_sum'
}

export interface BacktestResponse {
  fundCode: string
  fundName: string
  frequency: InvestFrequency
  startDate: string
  endDate: string
  metrics: BacktestMetrics
  series: BacktestSeries
  transactions: BacktestTransaction[]
}

export interface ApiErrorBody {
  error?: string
  message?: string
  code?: string
}

export class ApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}
