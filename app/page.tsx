'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import { listSchedules, pauseSchedule, resumeSchedule, getScheduleLogs, cronToHuman, updateScheduleMessage, Schedule, ExecutionLog } from '@/lib/scheduler'
import { FiTrendingUp, FiBarChart2, FiClock, FiMail, FiSettings, FiPlay, FiPause, FiRefreshCw, FiChevronDown, FiChevronUp, FiAlertCircle, FiCheckCircle, FiActivity, FiGrid, FiList, FiCalendar, FiArrowUp, FiArrowDown, FiX } from 'react-icons/fi'

// ─── Agent IDs ───────────────────────────────────────────────────────────────
const COORDINATOR_AGENT_ID = '69a023c473b2968d073614b6'
const REPORT_DELIVERY_AGENT_ID = '69a023dca2c9d4f61dfad0ea'
const INITIAL_SCHEDULE_ID = '69a023e325d4d77f732e4fa8'

// ─── Types ───────────────────────────────────────────────────────────────────
interface PriceMovement {
  ticker: string
  company_name: string
  current_price: string
  price_change: string
  percent_change: string
  volume: string
}

interface SentimentItem {
  ticker: string
  sentiment: string
  key_news: string
  analyst_outlook: string
}

interface TechnicalIndicator {
  ticker: string
  rsi: string
  macd_status: string
  sma_50: string
  sma_200: string
  support: string
  resistance: string
  technical_outlook: string
}

interface Recommendation {
  ticker: string
  action: string
  reasoning: string
  risk_level: string
}

interface PortfolioReport {
  report_date: string
  executive_summary: string
  portfolio_health: string
  price_movements: PriceMovement[]
  sentiment_analysis: SentimentItem[]
  technical_indicators: TechnicalIndicator[]
  recommendations: Recommendation[]
  risk_assessment: string
  market_overview: string
  generated_at?: string
}

interface AppSettings {
  tickers: string[]
  email: string
  timezone: string
  scheduleTime: string
}

interface HistoryEntry {
  id: string
  report: PortfolioReport
  generatedAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL']
const DEFAULT_SETTINGS: AppSettings = {
  tickers: DEFAULT_TICKERS,
  email: '',
  timezone: 'America/New_York',
  scheduleTime: '07:00',
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const LOADING_MESSAGES = [
  'Analyzing market data...',
  'Gathering news sentiment...',
  'Computing technical indicators...',
  'Aggregating findings...',
  'Preparing recommendations...',
]

const AGENTS = [
  { id: COORDINATOR_AGENT_ID, name: 'Portfolio Analysis Coordinator', purpose: 'Orchestrates analysis and produces the full report' },
  { id: REPORT_DELIVERY_AGENT_ID, name: 'Report Delivery Agent', purpose: 'Sends formatted reports via email' },
  { id: '69a023ad95ad8ebce61fe16f', name: 'Market Data Agent', purpose: 'Fetches real-time prices and volume data' },
  { id: '69a023aed3c3061698671926', name: 'News & Sentiment Agent', purpose: 'Researches headlines and market sentiment' },
  { id: '69a023ae9c293c5b871a4b60', name: 'Technical Analysis Agent', purpose: 'Computes RSI, MACD, SMA and chart patterns' },
]

// ─── Sample Data ─────────────────────────────────────────────────────────────
const SAMPLE_REPORT: PortfolioReport = {
  report_date: '2025-02-26',
  executive_summary: 'Markets showed mixed signals today with tech stocks leading gains. NVDA surged on strong AI demand outlook while TSLA faced headwinds from regulatory concerns. Overall portfolio health remains robust with a slight bullish tilt.',
  portfolio_health: 'Strong',
  price_movements: [
    { ticker: 'AAPL', company_name: 'Apple Inc.', current_price: '$189.42', price_change: '+$2.15', percent_change: '+1.15%', volume: '58.3M' },
    { ticker: 'TSLA', company_name: 'Tesla Inc.', current_price: '$248.30', price_change: '-$5.60', percent_change: '-2.21%', volume: '112.7M' },
    { ticker: 'NVDA', company_name: 'NVIDIA Corp.', current_price: '$875.50', price_change: '+$24.30', percent_change: '+2.85%', volume: '43.1M' },
    { ticker: 'MSFT', company_name: 'Microsoft Corp.', current_price: '$415.80', price_change: '+$1.90', percent_change: '+0.46%', volume: '22.4M' },
    { ticker: 'GOOGL', company_name: 'Alphabet Inc.', current_price: '$147.60', price_change: '-$0.85', percent_change: '-0.57%', volume: '28.9M' },
  ],
  sentiment_analysis: [
    { ticker: 'AAPL', sentiment: 'Bullish', key_news: 'New Vision Pro sales data exceeds expectations; Services revenue at all-time high', analyst_outlook: 'Consensus Buy with $210 target' },
    { ticker: 'TSLA', sentiment: 'Bearish', key_news: 'Regulatory scrutiny on FSD software intensifies; Price cuts in EU markets', analyst_outlook: 'Mixed - Targets range from $180 to $350' },
    { ticker: 'NVDA', sentiment: 'Strongly Bullish', key_news: 'Data center revenue continues exponential growth; New B200 chip orders flood in', analyst_outlook: 'Strong Buy consensus with $1,000 target' },
    { ticker: 'MSFT', sentiment: 'Bullish', key_news: 'Azure AI services adoption accelerating; Copilot enterprise deployments growing', analyst_outlook: 'Buy with $460 median target' },
    { ticker: 'GOOGL', sentiment: 'Neutral', key_news: 'Search market share stable; YouTube ad revenue slightly below estimates', analyst_outlook: 'Hold to Buy with $165 target' },
  ],
  technical_indicators: [
    { ticker: 'AAPL', rsi: '58.3', macd_status: 'Bullish Crossover', sma_50: '$184.20', sma_200: '$178.50', support: '$182.00', resistance: '$195.00', technical_outlook: 'Moderately Bullish' },
    { ticker: 'TSLA', rsi: '42.1', macd_status: 'Bearish', sma_50: '$255.40', sma_200: '$240.80', support: '$235.00', resistance: '$260.00', technical_outlook: 'Bearish' },
    { ticker: 'NVDA', rsi: '71.5', macd_status: 'Strongly Bullish', sma_50: '$820.30', sma_200: '$680.00', support: '$840.00', resistance: '$920.00', technical_outlook: 'Bullish - Approaching Overbought' },
    { ticker: 'MSFT', rsi: '54.8', macd_status: 'Neutral', sma_50: '$410.00', sma_200: '$385.60', support: '$405.00', resistance: '$425.00', technical_outlook: 'Neutral to Bullish' },
    { ticker: 'GOOGL', rsi: '47.2', macd_status: 'Bearish Divergence', sma_50: '$150.20', sma_200: '$142.80', support: '$143.00', resistance: '$155.00', technical_outlook: 'Neutral' },
  ],
  recommendations: [
    { ticker: 'AAPL', action: 'Buy', reasoning: 'Strong fundamentals with services growth catalyst. Trading below analyst consensus target.', risk_level: 'Low' },
    { ticker: 'TSLA', action: 'Hold', reasoning: 'Near-term headwinds from regulatory concerns offset by long-term EV market opportunity.', risk_level: 'High' },
    { ticker: 'NVDA', action: 'Watch', reasoning: 'Exceptional momentum but RSI approaching overbought territory. Wait for pullback entry.', risk_level: 'Medium' },
    { ticker: 'MSFT', action: 'Buy', reasoning: 'Steady growth with AI tailwinds. Cloud segment continues to gain market share.', risk_level: 'Low' },
    { ticker: 'GOOGL', action: 'Hold', reasoning: 'Stable business but facing competitive pressures in AI search. Valuation is fair.', risk_level: 'Medium' },
  ],
  risk_assessment: 'Portfolio risk is moderate. Primary concerns include concentration in tech sector and potential Fed rate decisions impacting growth stocks. Diversification across sub-sectors (hardware, software, EVs, semiconductors) provides some buffer. Recommend maintaining 5-10% cash position for opportunity buys.',
  market_overview: 'The S&P 500 is trading near all-time highs with breadth improving. VIX at 14.2 signals low volatility expectations. Bond yields are stabilizing after recent movements. Sector rotation favoring technology and communication services. Upcoming FOMC minutes could provide direction for the next leg.',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseAgentResponse(result: AIAgentResponse): PortfolioReport | null {
  try {
    let data = result?.response?.result as unknown
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch { return null }
    }
    if (data && typeof data === 'object' && 'result' in (data as Record<string, unknown>)) {
      const inner = (data as Record<string, unknown>).result
      if (typeof inner === 'string') {
        try { data = JSON.parse(inner) } catch { /* keep data */ }
      } else {
        data = inner
      }
    }
    if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
      if (result?.raw_response) {
        try {
          const raw = JSON.parse(result.raw_response)
          if (raw?.result) {
            data = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result
          }
        } catch { /* ignore */ }
      }
    }
    return data as PortfolioReport | null
  } catch {
    return null
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-serif font-medium text-sm mt-3 mb-1 tracking-wider">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-serif font-medium text-base mt-3 mb-1 tracking-wider">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-serif font-medium text-lg mt-4 mb-2 tracking-wider">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-medium">{part}</strong> : part)
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem('stockpulse_settings')
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

function saveSettings(s: AppSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem('stockpulse_settings', JSON.stringify(s))
}

function loadReportHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('stockpulse_reports')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveReportHistory(history: HistoryEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('stockpulse_reports', JSON.stringify(history))
}

function isPositiveChange(val: string): boolean {
  return val?.includes('+') || false
}

function isNegativeChange(val: string): boolean {
  return val?.startsWith('-') || false
}

function getActionColor(action: string): string {
  const a = (action ?? '').toLowerCase()
  if (a.includes('buy') || a.includes('strong buy')) return 'bg-green-100 text-green-800 border-green-300'
  if (a.includes('sell')) return 'bg-red-100 text-red-800 border-red-300'
  if (a.includes('hold')) return 'bg-amber-100 text-amber-800 border-amber-300'
  if (a.includes('watch')) return 'bg-blue-100 text-blue-800 border-blue-300'
  return 'bg-gray-100 text-gray-800 border-gray-300'
}

function getSentimentColor(sentiment: string): string {
  const s = (sentiment ?? '').toLowerCase()
  if (s.includes('strongly bullish') || s.includes('very bullish')) return 'bg-green-100 text-green-800 border-green-300'
  if (s.includes('bullish')) return 'bg-emerald-100 text-emerald-800 border-emerald-300'
  if (s.includes('bearish')) return 'bg-red-100 text-red-800 border-red-300'
  return 'bg-gray-100 text-gray-700 border-gray-300'
}

function getRiskColor(risk: string): string {
  const r = (risk ?? '').toLowerCase()
  if (r.includes('high')) return 'text-red-700'
  if (r.includes('medium')) return 'text-amber-700'
  if (r.includes('low')) return 'text-green-700'
  return 'text-gray-700'
}

// ─── ErrorBoundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-serif font-medium mb-2 tracking-wider">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-6 py-2 bg-primary text-primary-foreground text-sm tracking-wider">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SidebarNav({ activeScreen, onNavigate, schedule }: {
  activeScreen: string
  onNavigate: (screen: string) => void
  schedule: Schedule | null
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
    { id: 'history', label: 'Report History', icon: FiList },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-secondary border-r border-border flex flex-col z-20">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <FiActivity className="w-5 h-5 text-primary" />
          <h1 className="font-serif text-lg font-medium tracking-widest text-foreground">STOCKPULSE</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1 tracking-wider">Portfolio Intelligence</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm tracking-wider transition-all ${isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FiClock className="w-3 h-3" />
          <span className="tracking-wider">
            {schedule?.is_active ? 'Schedule Active' : 'Schedule Paused'}
          </span>
        </div>
        {schedule?.next_run_time && schedule.is_active && (
          <p className="text-xs text-muted-foreground mt-1 tracking-wider">
            Next: {new Date(schedule.next_run_time).toLocaleString()}
          </p>
        )}
        {schedule?.cron_expression && (
          <p className="text-xs text-muted-foreground mt-1">{cronToHuman(schedule.cron_expression)}</p>
        )}
      </div>
    </aside>
  )
}

function SkeletonLoader({ message }: { message: string }) {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center gap-3 mb-8">
        <FiRefreshCw className="w-5 h-5 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground tracking-wider">{message}</span>
      </div>
      <div className="space-y-4">
        <div className="h-4 bg-muted animate-pulse w-3/4" />
        <div className="h-4 bg-muted animate-pulse w-1/2" />
        <div className="h-32 bg-muted animate-pulse w-full" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-muted animate-pulse" />
          <div className="h-24 bg-muted animate-pulse" />
        </div>
        <div className="h-4 bg-muted animate-pulse w-2/3" />
        <div className="h-48 bg-muted animate-pulse w-full" />
      </div>
    </div>
  )
}

function CollapsibleSection({ title, icon, children, expanded, onToggle }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-border bg-card">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted transition-all"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-serif text-sm font-medium tracking-widest uppercase">{title}</span>
        </div>
        {expanded ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="px-6 pb-6 border-t border-border pt-4">{children}</div>}
    </div>
  )
}

function ReportView({ report }: { report: PortfolioReport }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    prices: true,
    sentiment: false,
    technical: false,
    recommendations: true,
    risk: false,
    market: false,
  })

  const toggle = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  const priceMovements = Array.isArray(report?.price_movements) ? report.price_movements : []
  const sentimentAnalysis = Array.isArray(report?.sentiment_analysis) ? report.sentiment_analysis : []
  const technicalIndicators = Array.isArray(report?.technical_indicators) ? report.technical_indicators : []
  const recommendations = Array.isArray(report?.recommendations) ? report.recommendations : []

  return (
    <div className="space-y-0">
      {/* Report Date */}
      <div className="px-6 py-3 bg-secondary border border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiCalendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs tracking-widest text-muted-foreground uppercase">Report Date</span>
        </div>
        <span className="font-mono text-sm">{report?.report_date ?? 'N/A'}</span>
      </div>

      {/* Portfolio Health */}
      {report?.portfolio_health && (
        <div className="px-6 py-3 bg-card border border-border border-t-0 flex items-center justify-between">
          <span className="text-xs tracking-widest text-muted-foreground uppercase">Portfolio Health</span>
          <span className={`font-mono text-sm font-medium ${(report.portfolio_health ?? '').toLowerCase().includes('strong') ? 'text-green-700' : (report.portfolio_health ?? '').toLowerCase().includes('weak') ? 'text-red-700' : 'text-amber-700'}`}>
            {report.portfolio_health}
          </span>
        </div>
      )}

      {/* Executive Summary */}
      <CollapsibleSection
        title="Executive Summary"
        icon={<FiBarChart2 className="w-4 h-4 text-primary" />}
        expanded={expandedSections.summary ?? false}
        onToggle={() => toggle('summary')}
      >
        <div className="text-sm leading-relaxed text-foreground">
          {renderMarkdown(report?.executive_summary ?? '')}
        </div>
      </CollapsibleSection>

      {/* Price Movements */}
      <CollapsibleSection
        title="Price Movements"
        icon={<FiTrendingUp className="w-4 h-4 text-primary" />}
        expanded={expandedSections.prices ?? false}
        onToggle={() => toggle('prices')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs tracking-widest text-muted-foreground uppercase font-normal">Ticker</th>
                <th className="text-left py-2 px-3 text-xs tracking-widest text-muted-foreground uppercase font-normal">Company</th>
                <th className="text-right py-2 px-3 text-xs tracking-widest text-muted-foreground uppercase font-normal">Price</th>
                <th className="text-right py-2 px-3 text-xs tracking-widest text-muted-foreground uppercase font-normal">Change</th>
                <th className="text-right py-2 px-3 text-xs tracking-widest text-muted-foreground uppercase font-normal">% Change</th>
                <th className="text-right py-2 px-3 text-xs tracking-widest text-muted-foreground uppercase font-normal">Volume</th>
              </tr>
            </thead>
            <tbody>
              {priceMovements.map((pm, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted transition-colors">
                  <td className="py-3 px-3 font-mono font-medium">{pm?.ticker ?? ''}</td>
                  <td className="py-3 px-3 text-muted-foreground">{pm?.company_name ?? ''}</td>
                  <td className="py-3 px-3 text-right font-mono">{pm?.current_price ?? ''}</td>
                  <td className={`py-3 px-3 text-right font-mono ${isPositiveChange(pm?.price_change ?? '') ? 'text-green-700' : isNegativeChange(pm?.price_change ?? '') ? 'text-red-700' : ''}`}>
                    <span className="inline-flex items-center gap-1">
                      {isPositiveChange(pm?.price_change ?? '') && <FiArrowUp className="w-3 h-3" />}
                      {isNegativeChange(pm?.price_change ?? '') && <FiArrowDown className="w-3 h-3" />}
                      {pm?.price_change ?? ''}
                    </span>
                  </td>
                  <td className={`py-3 px-3 text-right font-mono ${isPositiveChange(pm?.percent_change ?? '') ? 'text-green-700' : isNegativeChange(pm?.percent_change ?? '') ? 'text-red-700' : ''}`}>
                    {pm?.percent_change ?? ''}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-muted-foreground">{pm?.volume ?? ''}</td>
                </tr>
              ))}
              {priceMovements.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground text-sm">No price data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Sentiment Analysis */}
      <CollapsibleSection
        title="News & Sentiment"
        icon={<FiActivity className="w-4 h-4 text-primary" />}
        expanded={expandedSections.sentiment ?? false}
        onToggle={() => toggle('sentiment')}
      >
        <div className="space-y-4">
          {sentimentAnalysis.map((sa, idx) => (
            <div key={idx} className="border border-border p-4 bg-secondary">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono font-medium text-sm">{sa?.ticker ?? ''}</span>
                <span className={`text-xs px-3 py-1 border tracking-wider uppercase ${getSentimentColor(sa?.sentiment ?? '')}`}>
                  {sa?.sentiment ?? 'N/A'}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-xs tracking-widest text-muted-foreground uppercase">Key News</span>
                  <p className="text-sm leading-relaxed mt-1">{sa?.key_news ?? ''}</p>
                </div>
                <div>
                  <span className="text-xs tracking-widest text-muted-foreground uppercase">Analyst Outlook</span>
                  <p className="text-sm leading-relaxed mt-1">{sa?.analyst_outlook ?? ''}</p>
                </div>
              </div>
            </div>
          ))}
          {sentimentAnalysis.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No sentiment data available</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Technical Indicators */}
      <CollapsibleSection
        title="Technical Indicators"
        icon={<FiBarChart2 className="w-4 h-4 text-primary" />}
        expanded={expandedSections.technical ?? false}
        onToggle={() => toggle('technical')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs tracking-widest text-muted-foreground uppercase font-normal">Ticker</th>
                <th className="text-center py-2 px-2 text-xs tracking-widest text-muted-foreground uppercase font-normal">RSI</th>
                <th className="text-center py-2 px-2 text-xs tracking-widest text-muted-foreground uppercase font-normal">MACD</th>
                <th className="text-right py-2 px-2 text-xs tracking-widest text-muted-foreground uppercase font-normal">SMA 50</th>
                <th className="text-right py-2 px-2 text-xs tracking-widest text-muted-foreground uppercase font-normal">SMA 200</th>
                <th className="text-right py-2 px-2 text-xs tracking-widest text-muted-foreground uppercase font-normal">Support</th>
                <th className="text-right py-2 px-2 text-xs tracking-widest text-muted-foreground uppercase font-normal">Resistance</th>
                <th className="text-center py-2 px-2 text-xs tracking-widest text-muted-foreground uppercase font-normal">Outlook</th>
              </tr>
            </thead>
            <tbody>
              {technicalIndicators.map((ti, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted transition-colors">
                  <td className="py-3 px-2 font-mono font-medium">{ti?.ticker ?? ''}</td>
                  <td className="py-3 px-2 text-center font-mono">{ti?.rsi ?? ''}</td>
                  <td className="py-3 px-2 text-center text-xs">{ti?.macd_status ?? ''}</td>
                  <td className="py-3 px-2 text-right font-mono">{ti?.sma_50 ?? ''}</td>
                  <td className="py-3 px-2 text-right font-mono">{ti?.sma_200 ?? ''}</td>
                  <td className="py-3 px-2 text-right font-mono">{ti?.support ?? ''}</td>
                  <td className="py-3 px-2 text-right font-mono">{ti?.resistance ?? ''}</td>
                  <td className="py-3 px-2 text-center text-xs">{ti?.technical_outlook ?? ''}</td>
                </tr>
              ))}
              {technicalIndicators.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-muted-foreground text-sm">No technical data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Recommendations */}
      <CollapsibleSection
        title="Recommendations"
        icon={<FiCheckCircle className="w-4 h-4 text-primary" />}
        expanded={expandedSections.recommendations ?? false}
        onToggle={() => toggle('recommendations')}
      >
        <div className="grid grid-cols-1 gap-3">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="border border-border p-4 bg-secondary flex items-start gap-4">
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <span className="font-mono font-medium text-sm">{rec?.ticker ?? ''}</span>
                <span className={`text-xs px-3 py-1 border tracking-wider uppercase font-medium ${getActionColor(rec?.action ?? '')}`}>
                  {rec?.action ?? 'N/A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{rec?.reasoning ?? ''}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs tracking-widest text-muted-foreground uppercase">Risk:</span>
                  <span className={`text-xs font-medium ${getRiskColor(rec?.risk_level ?? '')}`}>{rec?.risk_level ?? ''}</span>
                </div>
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No recommendations available</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Risk Assessment */}
      <CollapsibleSection
        title="Risk Assessment"
        icon={<FiAlertCircle className="w-4 h-4 text-primary" />}
        expanded={expandedSections.risk ?? false}
        onToggle={() => toggle('risk')}
      >
        <div className="text-sm leading-relaxed">
          {renderMarkdown(report?.risk_assessment ?? '')}
        </div>
      </CollapsibleSection>

      {/* Market Overview */}
      <CollapsibleSection
        title="Market Overview"
        icon={<FiTrendingUp className="w-4 h-4 text-primary" />}
        expanded={expandedSections.market ?? false}
        onToggle={() => toggle('market')}
      >
        <div className="text-sm leading-relaxed">
          {renderMarkdown(report?.market_overview ?? '')}
        </div>
      </CollapsibleSection>
    </div>
  )
}

function SummaryTiles({ report }: { report: PortfolioReport | null }) {
  const priceMovements = Array.isArray(report?.price_movements) ? report.price_movements : []

  const topGainer = priceMovements.reduce<PriceMovement | null>((best, pm) => {
    const val = parseFloat((pm?.percent_change ?? '0').replace(/[^-\d.]/g, ''))
    const bestVal = best ? parseFloat((best?.percent_change ?? '0').replace(/[^-\d.]/g, '')) : -Infinity
    return val > bestVal ? pm : best
  }, null)

  const topLoser = priceMovements.reduce<PriceMovement | null>((worst, pm) => {
    const val = parseFloat((pm?.percent_change ?? '0').replace(/[^-\d.]/g, ''))
    const worstVal = worst ? parseFloat((worst?.percent_change ?? '0').replace(/[^-\d.]/g, '')) : Infinity
    return val < worstVal ? pm : worst
  }, null)

  return (
    <div className="space-y-4">
      {/* Portfolio Health */}
      <div className="border border-border bg-card p-5">
        <div className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Portfolio Health</div>
        <div className={`font-serif text-xl font-medium ${report?.portfolio_health ? ((report.portfolio_health).toLowerCase().includes('strong') ? 'text-green-700' : 'text-amber-700') : 'text-muted-foreground'}`}>
          {report?.portfolio_health ?? 'Awaiting Analysis'}
        </div>
      </div>

      {/* Top Gainer */}
      <div className="border border-border bg-card p-5">
        <div className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Top Gainer</div>
        {topGainer ? (
          <div className="flex items-center justify-between">
            <span className="font-mono font-medium">{topGainer.ticker}</span>
            <span className="font-mono text-green-700 flex items-center gap-1">
              <FiArrowUp className="w-3 h-3" />
              {topGainer.percent_change}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">--</span>
        )}
        {topGainer && <p className="text-xs text-muted-foreground mt-1">{topGainer.company_name}</p>}
      </div>

      {/* Top Loser */}
      <div className="border border-border bg-card p-5">
        <div className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Top Loser</div>
        {topLoser ? (
          <div className="flex items-center justify-between">
            <span className="font-mono font-medium">{topLoser.ticker}</span>
            <span className="font-mono text-red-700 flex items-center gap-1">
              <FiArrowDown className="w-3 h-3" />
              {topLoser.percent_change}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">--</span>
        )}
        {topLoser && <p className="text-xs text-muted-foreground mt-1">{topLoser.company_name}</p>}
      </div>

      {/* Holdings Count */}
      <div className="border border-border bg-card p-5">
        <div className="text-xs tracking-widest text-muted-foreground uppercase mb-2">Holdings Tracked</div>
        <div className="font-mono text-xl font-medium">{priceMovements.length}</div>
      </div>

      {/* Quick Recommendations */}
      <div className="border border-border bg-card p-5">
        <div className="text-xs tracking-widest text-muted-foreground uppercase mb-3">Quick Actions</div>
        <div className="space-y-2">
          {Array.isArray(report?.recommendations) && report.recommendations.slice(0, 3).map((rec, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="font-mono">{rec?.ticker ?? ''}</span>
              <span className={`text-xs px-2 py-0.5 border ${getActionColor(rec?.action ?? '')}`}>{rec?.action ?? ''}</span>
            </div>
          ))}
          {(!Array.isArray(report?.recommendations) || report.recommendations.length === 0) && (
            <span className="text-muted-foreground text-sm">--</span>
          )}
        </div>
      </div>
    </div>
  )
}

function DashboardScreen({ report, loading, loadingMessage, onGenerate, sampleMode }: {
  report: PortfolioReport | null
  loading: boolean
  loadingMessage: string
  onGenerate: () => void
  sampleMode: boolean
}) {
  const displayReport = sampleMode && !report ? SAMPLE_REPORT : report

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-xl font-medium tracking-widest uppercase">Dashboard</h2>
          <p className="text-sm text-muted-foreground tracking-wider mt-1">Your latest portfolio analysis</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="px-6 py-3 bg-primary text-primary-foreground text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {loading && <SkeletonLoader message={loadingMessage} />}

      {!loading && displayReport && (
        <div className="flex gap-6">
          {/* Main Report */}
          <div className="flex-1 min-w-0">
            <ReportView report={displayReport} />
          </div>
          {/* Sidebar Tiles */}
          <div className="w-64 flex-shrink-0">
            <SummaryTiles report={displayReport} />
          </div>
        </div>
      )}

      {!loading && !displayReport && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FiBarChart2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-serif text-lg font-medium tracking-widest mb-2">No Report Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Click &quot;Generate Report&quot; to analyze your portfolio holdings. The AI will gather market data, news sentiment, and technical indicators to produce a comprehensive analysis.
          </p>
        </div>
      )}
    </div>
  )
}

function HistoryScreen({ history, selectedReport, onSelect, onClear, sampleMode }: {
  history: HistoryEntry[]
  selectedReport: HistoryEntry | null
  onSelect: (entry: HistoryEntry | null) => void
  onClear: () => void
  sampleMode: boolean
}) {
  const displayHistory = sampleMode && history.length === 0
    ? [{ id: 'sample-1', report: SAMPLE_REPORT, generatedAt: new Date().toISOString() }]
    : history

  if (selectedReport) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => onSelect(null)} className="text-sm text-primary tracking-wider hover:underline flex items-center gap-1 mb-2">
              <FiChevronUp className="w-3 h-3 rotate-[-90deg]" /> Back to History
            </button>
            <h2 className="font-serif text-xl font-medium tracking-widest uppercase">Report Detail</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{new Date(selectedReport.generatedAt).toLocaleString()}</span>
        </div>
        <ReportView report={selectedReport.report} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-xl font-medium tracking-widest uppercase">Report History</h2>
          <p className="text-sm text-muted-foreground tracking-wider mt-1">Browse past portfolio analyses</p>
        </div>
        {history.length > 0 && (
          <button onClick={onClear} className="text-xs text-muted-foreground tracking-wider hover:text-foreground transition-colors">Clear History</button>
        )}
      </div>

      {displayHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FiClock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-serif text-lg font-medium tracking-widest mb-2">No Reports Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Your first report will appear here after you generate one from the Dashboard or when the daily schedule runs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayHistory.map((entry) => {
            const priceMovements = Array.isArray(entry.report?.price_movements) ? entry.report.price_movements : []
            const recommendations = Array.isArray(entry.report?.recommendations) ? entry.report.recommendations : []
            const buyCount = recommendations.filter(r => (r?.action ?? '').toLowerCase().includes('buy')).length
            const sellCount = recommendations.filter(r => (r?.action ?? '').toLowerCase().includes('sell')).length

            return (
              <button
                key={entry.id}
                onClick={() => onSelect(entry)}
                className="w-full text-left border border-border bg-card p-5 hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm">{entry.report?.report_date ?? 'Unknown Date'}</span>
                  <span className="text-xs text-muted-foreground font-mono">{new Date(entry.generatedAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                  {entry.report?.executive_summary ?? 'No summary available'}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{priceMovements.length} holdings</span>
                  {buyCount > 0 && <span className="text-green-700">{buyCount} Buy</span>}
                  {sellCount > 0 && <span className="text-red-700">{sellCount} Sell</span>}
                  <span>Health: {entry.report?.portfolio_health ?? 'N/A'}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SettingsScreen({ settings, onSettingsChange, schedule, scheduleId, executionLogs, onScheduleToggle, onRefreshSchedule, onSaveEmail, scheduleLoading, statusMessage }: {
  settings: AppSettings
  onSettingsChange: (s: AppSettings) => void
  schedule: Schedule | null
  scheduleId: string
  executionLogs: ExecutionLog[]
  onScheduleToggle: () => void
  onRefreshSchedule: () => void
  onSaveEmail: (email: string) => void
  scheduleLoading: boolean
  statusMessage: { type: 'success' | 'error' | 'info'; text: string } | null
}) {
  const [tickerInput, setTickerInput] = useState('')
  const [localEmail, setLocalEmail] = useState(settings.email)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const handleAddTicker = () => {
    const ticker = tickerInput.trim().toUpperCase()
    if (ticker && !settings.tickers.includes(ticker)) {
      onSettingsChange({ ...settings, tickers: [...settings.tickers, ticker] })
    }
    setTickerInput('')
  }

  const handleRemoveTicker = (t: string) => {
    onSettingsChange({ ...settings, tickers: settings.tickers.filter(x => x !== t) })
  }

  const handleSave = () => {
    const updated = { ...settings, email: localEmail }
    onSettingsChange(updated)
    saveSettings(updated)
    setSaveMsg('Settings saved successfully')
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const handleSaveAndSyncEmail = () => {
    const updated = { ...settings, email: localEmail }
    onSettingsChange(updated)
    saveSettings(updated)
    onSaveEmail(localEmail)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-xl font-medium tracking-widest uppercase">Settings</h2>
        <p className="text-sm text-muted-foreground tracking-wider mt-1">Configure your portfolio and delivery preferences</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Portfolio Holdings */}
        <div className="border border-border bg-card p-6">
          <h3 className="font-serif text-sm font-medium tracking-widest uppercase mb-4">Portfolio Holdings</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTicker() }}
              placeholder="Add ticker (e.g. AMZN)"
              className="flex-1 px-4 py-2 border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={handleAddTicker} className="px-4 py-2 bg-primary text-primary-foreground text-sm tracking-wider">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.tickers.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary text-sm font-mono border border-border">
                {t}
                <button onClick={() => handleRemoveTicker(t)} className="ml-1 text-muted-foreground hover:text-foreground"><FiX className="w-3 h-3" /></button>
              </span>
            ))}
            {settings.tickers.length === 0 && <span className="text-sm text-muted-foreground">No tickers configured</span>}
          </div>
        </div>

        {/* Delivery Email */}
        <div className="border border-border bg-card p-6">
          <h3 className="font-serif text-sm font-medium tracking-widest uppercase mb-4">Delivery Email</h3>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">Reports will be sent to this email address. Saving will sync the email with the scheduled delivery agent.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={localEmail}
              onChange={(e) => setLocalEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-4 py-2 border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={handleSaveAndSyncEmail} disabled={!localEmail || scheduleLoading} className="px-4 py-2 bg-primary text-primary-foreground text-sm tracking-wider disabled:opacity-50 flex items-center gap-2">
              {scheduleLoading ? <FiRefreshCw className="w-3 h-3 animate-spin" /> : <FiMail className="w-3 h-3" />}
              Save & Sync
            </button>
          </div>
          {statusMessage && (
            <div className={`mt-3 flex items-center gap-2 text-xs ${statusMessage.type === 'success' ? 'text-green-700' : statusMessage.type === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
              {statusMessage.type === 'success' ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Schedule Configuration */}
        <div className="border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-sm font-medium tracking-widest uppercase">Schedule Configuration</h3>
            <button onClick={onRefreshSchedule} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <FiRefreshCw className={`w-3 h-3 ${scheduleLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Schedule Status */}
          <div className="flex items-center justify-between mb-4 p-3 bg-secondary border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 ${schedule?.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm tracking-wider">{schedule?.is_active ? 'Active' : 'Paused'}</span>
            </div>
            <button
              onClick={onScheduleToggle}
              disabled={scheduleLoading || (!settings.email && !schedule?.is_active)}
              className={`px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2 disabled:opacity-50 ${schedule?.is_active ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-green-100 text-green-800 border border-green-300'}`}
            >
              {schedule?.is_active ? <><FiPause className="w-3 h-3" /> Pause</> : <><FiPlay className="w-3 h-3" /> Activate</>}
            </button>
          </div>
          {!settings.email && !schedule?.is_active && (
            <p className="text-xs text-amber-700 mb-4 flex items-center gap-1">
              <FiAlertCircle className="w-3 h-3" />
              Save a delivery email above before activating the schedule
            </p>
          )}

          {/* Schedule Details */}
          {schedule && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground tracking-wider text-xs uppercase">Frequency</span>
                <span className="font-mono text-xs">{schedule.cron_expression ? cronToHuman(schedule.cron_expression) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground tracking-wider text-xs uppercase">Timezone</span>
                <span className="font-mono text-xs">{schedule.timezone ?? 'N/A'}</span>
              </div>
              {schedule.next_run_time && schedule.is_active && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground tracking-wider text-xs uppercase">Next Run</span>
                  <span className="font-mono text-xs">{new Date(schedule.next_run_time).toLocaleString()}</span>
                </div>
              )}
              {schedule.last_run_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground tracking-wider text-xs uppercase">Last Run</span>
                  <span className="font-mono text-xs">{new Date(schedule.last_run_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
          {!schedule && (
            <p className="text-xs text-muted-foreground">Loading schedule information...</p>
          )}
        </div>

        {/* Timezone and Time */}
        <div className="border border-border bg-card p-6">
          <h3 className="font-serif text-sm font-medium tracking-widest uppercase mb-4">Preferences</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs tracking-widest text-muted-foreground uppercase block mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => onSettingsChange({ ...settings, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs tracking-widest text-muted-foreground uppercase block mb-2">Preferred Time</label>
              <input
                type="time"
                value={settings.scheduleTime}
                onChange={(e) => onSettingsChange({ ...settings, scheduleTime: e.target.value })}
                className="w-full px-3 py-2 border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Execution Logs */}
        <div className="border border-border bg-card p-6">
          <h3 className="font-serif text-sm font-medium tracking-widest uppercase mb-4">Recent Execution Logs</h3>
          {executionLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No execution logs yet</p>
          ) : (
            <div className="space-y-2">
              {executionLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-secondary border border-border text-xs">
                  <div className="flex items-center gap-2">
                    {log.success ? <FiCheckCircle className="w-3 h-3 text-green-600" /> : <FiAlertCircle className="w-3 h-3 text-red-600" />}
                    <span className="font-mono">{new Date(log.executed_at).toLocaleString()}</span>
                  </div>
                  <span className={log.success ? 'text-green-700' : 'text-red-700'}>{log.success ? 'Success' : 'Failed'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save All */}
        <div>
          <button onClick={handleSave} className="px-8 py-3 bg-primary text-primary-foreground text-sm tracking-widest uppercase">
            Save All Settings
          </button>
          {saveMsg && <p className="text-xs text-green-700 mt-2 flex items-center gap-1"><FiCheckCircle className="w-3 h-3" />{saveMsg}</p>}
        </div>
      </div>
    </div>
  )
}

function AgentStatusPanel({ agents, activeAgentId }: { agents: typeof AGENTS; activeAgentId: string | null }) {
  return (
    <div className="border border-border bg-card p-5 mt-6">
      <h3 className="font-serif text-xs font-medium tracking-widest uppercase mb-3 text-muted-foreground">Agent Status</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {agents.map((agent) => (
          <div key={agent.id} className={`flex items-center gap-2 p-2 text-xs border border-border ${activeAgentId === agent.id ? 'bg-primary/10 border-primary' : 'bg-secondary'}`}>
            <div className={`w-1.5 h-1.5 flex-shrink-0 ${activeAgentId === agent.id ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
            <div className="min-w-0">
              <div className="font-medium truncate">{agent.name}</div>
              <div className="text-muted-foreground truncate">{agent.purpose}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Page() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [report, setReport] = useState<PortfolioReport | null>(null)
  const [reportHistory, setReportHistory] = useState<HistoryEntry[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [scheduleId, setScheduleId] = useState(INITIAL_SCHEDULE_ID)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<HistoryEntry | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [sampleMode, setSampleMode] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [emailStatusMessage, setEmailStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load persisted state
  useEffect(() => {
    setSettings(loadSettings())
    setReportHistory(loadReportHistory())
  }, [])

  // Load schedule info with retry logic for initial load
  const loadScheduleData = useCallback(async (retries = 2, delayMs = 1500) => {
    setScheduleLoading(true)
    let attempt = 0
    let success = false

    while (attempt <= retries && !success) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, delayMs))
      }
      try {
        const listResult = await listSchedules()
        if (listResult.success && Array.isArray(listResult.schedules)) {
          const found = listResult.schedules.find(s => s.id === scheduleId)
          if (found) {
            setSchedule(found)
          } else if (listResult.schedules.length > 0) {
            setSchedule(listResult.schedules[0])
            setScheduleId(listResult.schedules[0].id)
          }
          success = true
        }
      } catch { /* retry */ }
      attempt++
    }

    try {
      const logsResult = await getScheduleLogs(scheduleId, { limit: 5 })
      if (logsResult.success && Array.isArray(logsResult.executions)) {
        setExecutionLogs(logsResult.executions)
      }
    } catch { /* ignore */ }
    setScheduleLoading(false)
  }, [scheduleId])

  // Delay initial schedule load to let sandbox/proxy stabilize
  useEffect(() => {
    const timer = setTimeout(() => {
      loadScheduleData()
    }, 1200)
    return () => clearTimeout(timer)
  }, [loadScheduleData])

  // Loading message rotation
  useEffect(() => {
    if (!loading) return
    let idx = 0
    setLoadingMessage(LOADING_MESSAGES[0])
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length
      setLoadingMessage(LOADING_MESSAGES[idx])
    }, 3000)
    return () => clearInterval(interval)
  }, [loading])

  // Generate report
  const handleGenerateReport = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setActiveAgentId(COORDINATOR_AGENT_ID)

    const tickers = settings.tickers.length > 0 ? settings.tickers : DEFAULT_TICKERS
    const message = `Generate the daily portfolio analysis report for the following stock tickers: ${tickers.join(', ')}. Provide comprehensive analysis covering market data, news sentiment, technical indicators, and actionable recommendations.`

    try {
      const result = await callAIAgent(message, COORDINATOR_AGENT_ID)

      if (result.success) {
        const parsed = parseAgentResponse(result)
        if (parsed && typeof parsed === 'object') {
          const reportData = parsed as PortfolioReport
          reportData.generated_at = new Date().toISOString()
          setReport(reportData)

          // Save to history
          const entry: HistoryEntry = {
            id: Date.now().toString(),
            report: reportData,
            generatedAt: new Date().toISOString(),
          }
          const updatedHistory = [entry, ...reportHistory].slice(0, 50)
          setReportHistory(updatedHistory)
          saveReportHistory(updatedHistory)

          // Optionally send email
          if (settings.email) {
            setActiveAgentId(REPORT_DELIVERY_AGENT_ID)
            const emailMessage = `Send the following portfolio analysis report via email to ${settings.email}:\n\n${JSON.stringify(reportData)}`
            await callAIAgent(emailMessage, REPORT_DELIVERY_AGENT_ID)
          }
        } else {
          setErrorMessage('Could not parse agent response. Please try again.')
        }
      } else {
        setErrorMessage(result?.error ?? 'Failed to generate report. Please try again.')
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }

    setActiveAgentId(null)
    setLoading(false)
  }, [settings, reportHistory])

  // Schedule toggle
  const handleScheduleToggle = useCallback(async () => {
    if (!schedule) return
    setScheduleLoading(true)
    try {
      if (schedule.is_active) {
        await pauseSchedule(scheduleId)
      } else {
        await resumeSchedule(scheduleId)
      }
      await loadScheduleData()
    } catch { /* ignore */ }
    setScheduleLoading(false)
  }, [schedule, scheduleId, loadScheduleData])

  // Save email to schedule
  const handleSaveEmail = useCallback(async (email: string) => {
    setScheduleLoading(true)
    setEmailStatusMessage({ type: 'info', text: 'Syncing email with schedule...' })
    try {
      const tickers = settings.tickers.length > 0 ? settings.tickers : DEFAULT_TICKERS
      const newMsg = `Generate the daily portfolio analysis report for the following stock tickers: ${tickers.join(', ')}. Provide comprehensive analysis and send the report via email to ${email}.`
      const result = await updateScheduleMessage(scheduleId, newMsg)
      if (result.success && result.newScheduleId) {
        setScheduleId(result.newScheduleId)
        setEmailStatusMessage({ type: 'success', text: 'Email synced with schedule successfully' })
        await loadScheduleData()
      } else {
        setEmailStatusMessage({ type: 'error', text: result?.error ?? 'Failed to sync email with schedule' })
      }
    } catch (err) {
      setEmailStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to sync email' })
    }
    setScheduleLoading(false)
    setTimeout(() => setEmailStatusMessage(null), 5000)
  }, [scheduleId, settings.tickers, loadScheduleData])

  // Clear history
  const handleClearHistory = () => {
    setReportHistory([])
    saveReportHistory([])
    setSelectedHistoryReport(null)
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        <SidebarNav
          activeScreen={activeScreen}
          onNavigate={(s) => { setActiveScreen(s); setSelectedHistoryReport(null) }}
          schedule={schedule}
        />

        {/* Main Content */}
        <main className="ml-60 min-h-screen">
          <div className="p-8">
            {/* Top bar with sample toggle */}
            <div className="flex items-center justify-end mb-6">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <span className="text-xs tracking-widest text-muted-foreground uppercase">Sample Data</span>
                <div
                  onClick={() => setSampleMode(!sampleMode)}
                  className={`relative w-10 h-5 border transition-colors cursor-pointer ${sampleMode ? 'bg-primary border-primary' : 'bg-muted border-border'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${sampleMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4" />
                  {errorMessage}
                </div>
                <button onClick={() => setErrorMessage(null)}><FiX className="w-4 h-4" /></button>
              </div>
            )}

            {/* Screens */}
            {activeScreen === 'dashboard' && (
              <DashboardScreen
                report={report}
                loading={loading}
                loadingMessage={loadingMessage}
                onGenerate={handleGenerateReport}
                sampleMode={sampleMode}
              />
            )}
            {activeScreen === 'history' && (
              <HistoryScreen
                history={reportHistory}
                selectedReport={selectedHistoryReport}
                onSelect={setSelectedHistoryReport}
                onClear={handleClearHistory}
                sampleMode={sampleMode}
              />
            )}
            {activeScreen === 'settings' && (
              <SettingsScreen
                settings={settings}
                onSettingsChange={setSettings}
                schedule={schedule}
                scheduleId={scheduleId}
                executionLogs={executionLogs}
                onScheduleToggle={handleScheduleToggle}
                onRefreshSchedule={loadScheduleData}
                onSaveEmail={handleSaveEmail}
                scheduleLoading={scheduleLoading}
                statusMessage={emailStatusMessage}
              />
            )}

            {/* Agent Status Panel */}
            <AgentStatusPanel agents={AGENTS} activeAgentId={activeAgentId} />
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
