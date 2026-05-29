import type {
  BacktestRequest,
  BacktestResponse,
  FundItem,
  FundsResponse,
  InvestFrequency,
  StrategyMetrics,
} from '../types/api'

const MOCK_FUNDS: FundItem[] = [
  { code: '005827', name: '易方达蓝筹精选混合 A', category: '混合型' },
  { code: '161725', name: '招商中证白酒指数(LOF)A', category: '指数型' },
  { code: '003096', name: '中欧医疗健康混合 C', category: '混合型' },
  { code: '320007', name: '诺安成长混合', category: '混合型' },
  { code: '260108', name: '景顺长城新兴成长混合 A', category: '混合型' },
  { code: '110022', name: '易方达消费行业股票', category: '股票型' },
  { code: '161005', name: '富国天惠成长混合 A/B(LOF)', category: '混合型' },
  { code: '001875', name: '前海开源沪港深优势精选混合 A', category: '混合型' },
  { code: '001410', name: '信澳新能源产业股票', category: '股票型' },
  { code: '008888', name: '华夏国证半导体芯片 ETF 联接 A', category: '指数型' },
  {
    code: '012922',
    name: '易方达全球成长精选混合(QDII)C（人民币份额）',
    category: 'QDII',
  },
]

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

function tradingDays(start: string, end: string): string[] {
  const days: string[] = []
  let cur = parseDate(start)
  const last = parseDate(end)
  while (cur <= last) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) days.push(formatDate(cur))
    cur = addDays(cur, 1)
  }
  return days
}

function periodStep(freq: InvestFrequency): number {
  if (freq === 'weekly') return 7
  if (freq === 'biweekly') return 14
  return 30
}

function buildMetrics(
  invested: number,
  ending: number,
  maxDrawdown: number,
): StrategyMetrics {
  const totalReturn = ending - invested
  const returnRate = invested > 0 ? totalReturn / invested : 0
  return {
    totalInvested: invested,
    endingAssets: ending,
    totalReturn,
    returnRate,
    maxDrawdown,
  }
}

export async function mockFetchFunds(): Promise<FundsResponse> {
  await delay(400)
  return {
    funds: MOCK_FUNDS.map((f) => ({
      ...f,
      currency: 'CNY',
      updatedAt: '2026-05-28T18:00:00Z',
    })),
    dataUpdatedAt: '2026-05-28T18:00:00Z',
  }
}

export async function mockRunBacktest(
  req: BacktestRequest,
): Promise<BacktestResponse> {
  await delay(700)

  if (req.startDate >= req.endDate) {
    throw new Error('开始日期必须早于结束日期')
  }
  if (req.amount <= 0) {
    throw new Error('定投金额必须大于 0')
  }

  const days = tradingDays(req.startDate, req.endDate)
  if (days.length < 10) {
    throw new Error('所选日期区间内无可用净值数据，请扩大范围')
  }

  const fund = MOCK_FUNDS.find((f) => f.code === req.fundCode)
  if (!fund) {
    throw new Error('未找到该基金')
  }

  const seed = req.fundCode.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const navBase = 1 + (seed % 50) / 100
  const navSeries = days.map((_, i) => {
    const wave = Math.sin(i / 18 + seed) * 0.06
    const trend = i * 0.00035
    return Number((navBase * (1 + trend + wave)).toFixed(4))
  })

  const step = periodStep(req.frequency)
  const investDates: string[] = []
  let idx = 0
  while (idx < days.length) {
    investDates.push(days[idx])
    idx += step
  }

  let dcaShares = 0
  let dcaInvested = 0
  const dcaAssets: number[] = []
  const lumpSumAssets: number[] = []
  const returnRates: number[] = []

  const firstNav = navSeries[0]
  const lumpInvested = investDates.length * req.amount
  const lumpShares = lumpInvested / firstNav

  let investPtr = 0
  for (let i = 0; i < days.length; i++) {
    const nav = navSeries[i]
    if (investPtr < investDates.length && days[i] === investDates[investPtr]) {
      dcaShares += req.amount / nav
      dcaInvested += req.amount
      investPtr++
    }
    const dcaVal = dcaShares * nav
    const lumpVal = lumpShares * nav
    dcaAssets.push(Number(dcaVal.toFixed(2)))
    lumpSumAssets.push(Number(lumpVal.toFixed(2)))
    const ret =
      dcaInvested > 0 ? (dcaVal - dcaInvested) / dcaInvested : 0
    returnRates.push(Number((ret * 100).toFixed(2)))
  }

  const maxDrawdown = (values: number[]) => {
    let peak = values[0]
    let minDd = 0
    for (const v of values) {
      if (v > peak) peak = v
      const dd = peak > 0 ? (v - peak) / peak : 0
      if (dd < minDd) minDd = dd
    }
    return minDd
  }

  const dcaEnding = dcaAssets[dcaAssets.length - 1]
  const lumpEnding = lumpSumAssets[lumpSumAssets.length - 1]

  const transactions: BacktestResponse['transactions'] = investDates.map((date) => {
    const nav = navSeries[days.indexOf(date)]
    return {
      date,
      amount: req.amount,
      nav,
      shares: Number((req.amount / nav).toFixed(4)),
      type: 'dca',
    }
  })

  if (transactions.length === 0) {
    throw new Error('区间内无有效扣款记录')
  }

  transactions.push({
    date: days[0],
    amount: lumpInvested,
    nav: firstNav,
    shares: Number(lumpShares.toFixed(4)),
    type: 'lump_sum',
  })

  return {
    fundCode: req.fundCode,
    fundName: fund.name,
    frequency: req.frequency,
    startDate: req.startDate,
    endDate: req.endDate,
    metrics: {
      dca: buildMetrics(
        dcaInvested,
        dcaEnding,
        maxDrawdown(dcaAssets),
      ),
      lumpSum: buildMetrics(
        lumpInvested,
        lumpEnding,
        maxDrawdown(lumpSumAssets),
      ),
    },
    series: {
      dates: days,
      dcaAssets,
      lumpSumAssets,
      nav: navSeries,
      returnRates,
    },
    transactions,
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
