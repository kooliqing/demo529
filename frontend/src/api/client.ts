import { mockFetchFunds, mockRunBacktest } from './mock'
import type {
  ApiErrorBody,
  BacktestRequest,
  BacktestResponse,
  FundsResponse,
} from '../types/api'
import { ApiError } from '../types/api'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'
const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function parseError(res: Response): Promise<never> {
  let message = `请求失败（${res.status}）`
  try {
    const body = (await res.json()) as ApiErrorBody
    message = body.message ?? body.error ?? message
    throw new ApiError(message, res.status, body.code)
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(message, res.status)
  }
}

export function isMockMode(): boolean {
  return useMock
}

export async function fetchFunds(): Promise<FundsResponse> {
  if (useMock) return mockFetchFunds()

  try {
    const res = await fetch(`${apiBase}/api/funds`)
    if (!res.ok) await parseError(res)
    return (await res.json()) as FundsResponse
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(
      '无法获取基金列表，请检查网络或稍后重试',
    )
  }
}

export async function runBacktest(
  req: BacktestRequest,
): Promise<BacktestResponse> {
  if (useMock) return mockRunBacktest(req)

  try {
    const res = await fetch(`${apiBase}/api/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) await parseError(res)
    return (await res.json()) as BacktestResponse
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError('回测请求失败，请检查网络或稍后重试')
  }
}
