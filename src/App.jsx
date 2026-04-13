import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import './index.css'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

// Miami STR revenue methodology (AirDNA-derived market multipliers)
// Formula: Projected STR Revenue = Long-term Monthly Rent × Bedroom Multiplier × Seasonal Factor
// Seasonality reflects Miami's Dec–Mar tourist peak. Adjust STR_MULTIPLIER for your market.
const STR_MULTIPLIER_BY_BED = { 1: 2.30, 2: 2.10, 3: 1.95, 4: 1.82, 5: 1.70 }
const SEASONALITY = [1.18, 1.28, 1.22, 1.05, 0.88, 0.82, 0.78, 0.80, 0.87, 0.94, 1.02, 1.22]
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const BASE_OCC  = { 1: 80, 2: 75, 3: 70, 4: 65, 5: 60 }

const STATUS_LABELS = { REPLIED: 'REPLIED ⚡', SENT: 'Sent', DRAFT: 'Draft Ready', NOT_SENT: 'Not Sent' }
const STATUS_CLASS  = { REPLIED: 'status-replied', SENT: 'status-sent', DRAFT: 'status-draft', NOT_SENT: 'status-none' }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getTime() { return new Date().toTimeString().slice(0, 8) }
function fmt(n) { return '$' + Math.abs(Math.round(n)).toLocaleString() }

function transformListing(listing, index) {
  const beds = listing.bedrooms || 2
  const multiplier = STR_MULTIPLIER_BY_BED[beds] || 2.1
  const currentMonth = new Date().getMonth()
  const seasonAdj = SEASONALITY[currentMonth]

  const monthlyRent = listing.price || 0
  const projectedAirbnb = Math.round(monthlyRent * multiplier * seasonAdj)
  const spread = projectedAirbnb - monthlyRent
  const margin = projectedAirbnb > 0 ? Math.round((spread / projectedAirbnb) * 1000) / 10 : 0
  const occupancyRate = BASE_OCC[beds] || 72

  // Score: based on margin and absolute spread
  const spreadScore = Math.min(5, spread / 600)
  const marginScore = Math.min(5, margin / 12)
  const profitScore = Math.min(10, Math.max(1, Math.round(spreadScore + marginScore)))

  return {
    id: listing.id || `listing-${index}`,
    address: listing.addressLine1 || listing.formattedAddress?.split(',')[0] || `Property ${index + 1}`,
    fullAddress: listing.formattedAddress || listing.addressLine1,
    landlord: 'Contact via listing',
    beds,
    baths: listing.bathrooms || 1,
    sqft: listing.squareFootage || 0,
    monthlyRent,
    projectedAirbnb,
    spread,
    margin,
    occupancyRate,
    profitScore,
    outreachStatus: 'NOT_SENT',
    daysOnMarket: listing.daysOnMarket || 0,
    listedDate: listing.listedDate || null,
    propertyType: listing.propertyType || 'Rental',
  }
}

function calcProfit(prop, occ) {
  const gross = Math.round(prop.projectedAirbnb * (occ / prop.occupancyRate))
  const platform = Math.round(gross * 0.15)
  const cleaning = 380 + (prop.beds - 1) * 40
  const utilities = 140
  const net = gross - prop.monthlyRent - platform - cleaning - utilities
  return { gross, platform, cleaning, utilities, net }
}

function calcBreakEven(prop) {
  const fixedCosts = prop.monthlyRent + 520 + (380 + (prop.beds - 1) * 40)
  const grossNeeded = fixedCosts / 0.85
  return Math.min(Math.max(Math.round((grossNeeded / prop.projectedAirbnb) * prop.occupancyRate), 40), 99)
}

function getMonthlyChart(prop, occ) {
  return MONTHS.map((month, i) => ({
    month,
    revenue: Math.round(prop.projectedAirbnb * (occ / prop.occupancyRate) * SEASONALITY[i])
  }))
}

function generateEmail(prop) {
  return `Subject: Short-Term Rental Partnership — ${prop.address}

Hi there,

I came across your listing for ${prop.address} and wanted to reach out about a property management partnership that I think you'd find genuinely valuable.

I specialize in short-term rental management in this market and have been reviewing properties that show strong potential on platforms like Airbnb and VRBO. Based on current market data, a property like yours could generate approximately ${fmt(prop.projectedAirbnb)}/month in gross STR revenue — compared to a long-term rent of ${fmt(prop.monthlyRent)}/month.

The way this works: I handle everything operationally — listing setup, dynamic pricing, guest screening, turnover coordination, and 24/7 communication. You receive a guaranteed monthly return with no involvement required on your end. I absorb the operational risk; you benefit from the upside.

I'd welcome a 15-minute call this week to walk through the numbers for your specific property. No obligation — if the math doesn't make sense, I'll be the first to say so.

Would Thursday or Friday work for a quick call?

Best,
[Your Name]
[Your Phone Number]
[Your Company]`
}

// ─── SETUP SCREEN ────────────────────────────────────────────────────────────

function SetupScreen() {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(0,212,184,0.15)', border: '1px solid rgba(0,212,184,0.3)' }}>
            <span style={{ fontSize: 32 }}>🏠</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: '#00d4b8', letterSpacing: '-0.5px' }}>ARBIHOST</h1>
          <p className="mt-2 text-sm" style={{ color: '#8b949e' }}>Airbnb Arbitrage Intelligence Dashboard</p>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={{ background: '#161b22', border: '1px solid #21262d' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ background: '#f87171' }} />
            <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>API Key Required</span>
          </div>
          <p className="text-sm mb-4" style={{ color: '#8b949e', lineHeight: 1.6 }}>
            ARBIHOST uses the <span style={{ color: '#00d4b8' }}>Rentcast API</span> to pull live rental listings and market data. You need a free API key to get started.
          </p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Get your free Rentcast API key', sub: 'app.rentcast.io/app/api-keys → Sign up free (50 req/month)' },
              { step: '2', text: 'Create your .env file', sub: 'cp .env.example .env  (in the project folder)' },
              { step: '3', text: 'Add your API key to .env', sub: 'RENTCAST_API_KEY=your_key_here' },
              { step: '4', text: 'Restart the dev server', sub: 'Stop and re-run: npm run dev' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: '#1c2333' }}>
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono" style={{ background: 'rgba(0,212,184,0.2)', color: '#00d4b8', border: '1px solid rgba(0,212,184,0.3)' }}>
                  {item.step}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#e6edf3' }}>{item.text}</div>
                  <div className="text-xs mt-0.5 font-mono" style={{ color: '#8b949e' }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-4 text-xs" style={{ background: 'rgba(0,212,184,0.05)', border: '1px solid rgba(0,212,184,0.15)' }}>
          <div className="font-semibold mb-1" style={{ color: '#00d4b8' }}>Why Rentcast?</div>
          <div style={{ color: '#8b949e', lineHeight: 1.5 }}>
            Free tier includes 50 API requests/month — enough for daily market analysis. Paid plans start at $29/month for unlimited access. No credit card required for the free tier.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: '#161b22' }}>
          <div className="skeleton h-3 w-48" />
          <div className="skeleton h-3 w-8" />
          <div className="skeleton h-3 w-8" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

// ─── SCORE BADGE ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const cls = score >= 9 ? 'score-9' : score >= 7 ? 'score-7' : score >= 5 ? 'score-5' : score >= 3 ? 'score-3' : 'score-1'
  return (
    <span className={`${cls} inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold font-mono`}>
      {score}
    </span>
  )
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const [apiStatus, setApiStatus] = useState('checking') // 'checking' | 'valid' | 'missing' | 'error'
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [occupancy, setOccupancy] = useState(null)
  const [zip, setZip] = useState('33101')
  const [zipInput, setZipInput] = useState('33101')
  const [filters, setFilters] = useState({ minSpread: '', minBeds: '0', status: 'all', search: '' })
  const [sort, setSort] = useState({ col: 'spread', dir: 'desc' })
  const [logs, setLogs] = useState([`[${getTime()}] ARBIHOST initialized. Ready to scan.`])
  const [scanModal, setScanModal] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [copied, setCopied] = useState(false)
  const logRef = useRef(null)

  // API key health-check on mount
  useEffect(() => {
    fetch('/api/rentcast/v1/markets?zipCode=33101&propertyType=All&bedrooms=2')
      .then(r => {
        if (r.status === 401 || r.status === 403) setApiStatus('missing')
        else if (r.ok) { setApiStatus('valid'); fetchListings('33101') }
        else setApiStatus('error')
      })
      .catch(() => setApiStatus('error'))
  }, [])

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev.slice(-100), `[${getTime()}] ${msg}`])
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  async function fetchListings(targetZip) {
    setLoading(true)
    setError(null)
    addLog(`Fetching Rentcast data for ZIP ${targetZip}...`)

    try {
      const url = `/api/rentcast/v1/listings/rental/long-term?zipCode=${targetZip}&limit=40&status=Active`
      const res = await fetch(url)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `API error ${res.status}`)
      }

      const data = await res.json()
      const raw = Array.isArray(data) ? data : (data.listings || data.data || [])
      addLog(`${raw.length} rental listings found for ZIP ${targetZip}`)

      if (raw.length === 0) {
        addLog(`No listings found. Try a different ZIP code.`)
        setProperties([])
        setLoading(false)
        return
      }

      const transformed = raw.map(transformListing)
      const sorted = transformed.sort((a, b) => b.spread - a.spread)
      setProperties(sorted)

      const profitable = sorted.filter(p => p.spread > 800).length
      addLog(`${profitable} profitable opportunities identified (spread > $800/mo)`)
      addLog(`Top spread: ${fmt(sorted[0]?.spread || 0)}/mo at ${sorted[0]?.address}`)

      // Market stats fetch (non-blocking)
      fetch(`/api/rentcast/v1/markets?zipCode=${targetZip}&propertyType=All`)
        .then(r => r.ok ? r.json() : null)
        .then(stats => {
          if (stats) addLog(`Market avg LT rent: ${fmt(stats.averageRent || 0)}/mo — Rentcast market data`)
        })
        .catch(() => {})

    } catch (err) {
      setError(err.message)
      addLog(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleScan() {
    setScanModal(false)
    setScanning(true)
    setScanProgress(0)
    addLog(`Starting new scan for ZIP ${zipInput}...`)

    let p = 0
    const iv = setInterval(() => {
      p += Math.random() * 18 + 6
      setScanProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(iv)
        setTimeout(async () => {
          setScanning(false)
          setScanProgress(0)
          setZip(zipInput)
          await fetchListings(zipInput)
        }, 400)
      }
    }, 220)
  }

  function handleMarkSent(id) {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, outreachStatus: 'SENT' } : p))
    if (selected?.id === id) setSelected(prev => ({ ...prev, outreachStatus: 'SENT' }))
    addLog(`Outreach marked as sent for ${properties.find(p => p.id === id)?.address}`)
  }

  function copyEmail() {
    if (!selected) return
    navigator.clipboard.writeText(generateEmail(selected)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  function toggleSort(col) {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' })
  }

  const filteredSorted = useMemo(() => {
    let r = [...properties]
    const ms = Number(filters.minSpread) || 0
    const mb = Number(filters.minBeds) || 0
    r = r.filter(p =>
      p.spread >= ms &&
      p.beds >= mb &&
      (filters.status === 'all' || p.outreachStatus === filters.status) &&
      (!filters.search || p.address.toLowerCase().includes(filters.search.toLowerCase()))
    )
    r.sort((a, b) => {
      const av = a[sort.col], bv = b[sort.col]
      if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sort.dir === 'asc' ? av - bv : bv - av
    })
    return r
  }, [properties, filters, sort])

  const top5ids = useMemo(() => new Set(
    [...properties].sort((a, b) => b.spread - a.spread).slice(0, 5).map(p => p.id)
  ), [properties])

  const currentOcc = selected ? (occupancy ?? selected.occupancyRate) : 75
  const profitData = selected ? calcProfit(selected, currentOcc) : null
  const breakEven  = selected ? calcBreakEven(selected) : null
  const chartData  = selected ? getMonthlyChart(selected, currentOcc) : []

  const avgRent    = properties.length ? Math.round(properties.reduce((s, p) => s + p.monthlyRent, 0) / properties.length) : 0
  const avgAirbnb  = properties.length ? Math.round(properties.reduce((s, p) => s + p.projectedAirbnb, 0) / properties.length) : 0
  const avgSpread  = properties.length ? Math.round(properties.reduce((s, p) => s + p.spread, 0) / properties.length) : 0
  const bestSpread = properties.length ? Math.max(...properties.map(p => p.spread)) : 0
  const profitable = properties.filter(p => p.spread > 800).length
  const sentCount  = properties.filter(p => p.outreachStatus === 'SENT' || p.outreachStatus === 'REPLIED').length

  // ── GATE: checking ──
  if (apiStatus === 'checking') {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full mx-auto mb-4 spin" style={{ border: '2px solid #21262d', borderTopColor: '#00d4b8' }} />
          <div className="text-sm" style={{ color: '#8b949e' }}>Connecting to Rentcast API...</div>
        </div>
      </div>
    )
  }

  if (apiStatus === 'missing' || apiStatus === 'error') return <SetupScreen />

  return (
    <div className="min-h-screen grid-bg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* HEADER */}
      <header style={{ background: '#0d1117', borderBottom: '1px solid #21262d' }} className="sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: 'rgba(0,212,184,0.15)', border: '1px solid rgba(0,212,184,0.3)' }}>
              <span style={{ fontSize: 18 }}>🏠</span>
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: '#00d4b8', letterSpacing: '-0.5px' }}>ARBIHOST</span>
          </div>

          {/* ZIP input */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13 }}>📍</span>
            <input
              type="text"
              value={zipInput}
              onChange={e => setZipInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="ZIP code"
              className="px-3 py-1.5 rounded-lg text-sm w-28"
              style={{ background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', outline: 'none' }}
            />
            <span className="text-xs" style={{ color: '#8b949e' }}>Miami, FL</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider" style={{ background: '#161b22', border: '1px solid #21262d', color: '#8b949e' }}>
              {properties.length} SCANNED
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider" style={{ background: 'rgba(0,212,184,0.1)', border: '1px solid rgba(0,212,184,0.3)', color: '#00d4b8' }}>
              {profitable} PROFITABLE
            </div>
            <div className="px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
              {sentCount} OUTREACH SENT
            </div>
            <div className="px-2 py-1 rounded-full text-xs font-bold font-mono" style={{ background: 'rgba(0,212,184,0.08)', border: '1px solid rgba(0,212,184,0.2)', color: '#00d4b8' }}>
              LIVE — Rentcast API
            </div>
          </div>

          <button
            onClick={() => setScanModal(true)}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
            style={{ background: '#00d4b8', color: '#0d1117', fontFamily: "'Syne', sans-serif", letterSpacing: '0.5px' }}
          >
            {scanning ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 spin" style={{ border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0d1117', borderRadius: '50%', display: 'inline-block' }} />
                SCANNING...
              </span>
            ) : '⚡ RUN NEW SCAN'}
          </button>
        </div>

        {scanning && (
          <div className="h-0.5" style={{ background: '#21262d' }}>
            <div className="h-full transition-all" style={{ width: `${scanProgress}%`, background: 'linear-gradient(90deg, #00d4b8, #4ade80)', boxShadow: '0 0 8px rgba(0,212,184,0.6)' }} />
          </div>
        )}
      </header>

      <div className="flex h-[calc(100vh-56px)]" style={{ overflow: 'hidden' }}>

        {/* MAIN */}
        <div className="flex flex-col flex-1 overflow-hidden" style={{ minWidth: 0 }}>

          {/* KPI CARDS */}
          <div className="grid grid-cols-4 gap-3 p-4" style={{ borderBottom: '1px solid #21262d', flexShrink: 0 }}>
            {[
              { label: 'Avg LT Monthly Rent', value: loading ? '—' : fmt(avgRent), sub: `ZIP ${zip} · Rentcast live data`, color: '#8b949e', icon: '🏘️' },
              { label: 'Avg Projected STR Revenue', value: loading ? '—' : fmt(avgAirbnb), sub: 'Formula: LT Rent × Market Multiplier', color: '#4ade80', icon: '📈' },
              { label: 'Avg Monthly Spread', value: loading ? '—' : fmt(avgSpread), sub: 'Projected STR − Long-term rent', color: '#00d4b8', icon: '💰', big: true },
              { label: 'Best Opportunity', value: loading ? '—' : `${fmt(bestSpread)}/mo`, sub: properties.length ? properties.find(p => p.spread === bestSpread)?.address?.slice(0, 22) + '…' : '—', color: '#fbbf24', icon: '🔥' },
            ].map((k, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: '#161b22', border: '1px solid #21262d' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium tracking-wide uppercase" style={{ color: '#8b949e' }}>{k.label}</span>
                  <span>{k.icon}</span>
                </div>
                {loading ? (
                  <div className="skeleton h-7 w-24 mt-1" />
                ) : (
                  <div className={`font-bold ${k.big ? 'text-3xl' : 'text-2xl'}`} style={{ color: k.color, fontFamily: "'Syne', sans-serif" }}>
                    {k.value}
                  </div>
                )}
                <div className="text-xs mt-1 truncate" style={{ color: '#8b949e' }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* FILTER BAR */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap" style={{ background: '#0d1117', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: '#8b949e' }}>Min Spread</span>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#8b949e' }}>$</span>
                <input type="number" placeholder="0" value={filters.minSpread} onChange={e => setFilters(f => ({ ...f, minSpread: e.target.value }))}
                  className="pl-4 pr-2 py-1 rounded text-xs w-20" style={{ background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', outline: 'none' }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: '#8b949e' }}>Min Beds</span>
              <select value={filters.minBeds} onChange={e => setFilters(f => ({ ...f, minBeds: e.target.value }))}
                className="px-2 py-1 rounded text-xs" style={{ background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', outline: 'none' }}>
                <option value="0">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: '#8b949e' }}>Status</span>
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="px-2 py-1 rounded text-xs" style={{ background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', outline: 'none' }}>
                <option value="all">All</option><option value="NOT_SENT">Not Sent</option><option value="DRAFT">Draft Ready</option><option value="SENT">Sent</option><option value="REPLIED">Replied</option>
              </select>
            </div>
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#8b949e' }}>🔍</span>
              <input type="text" placeholder="Search address..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="pl-6 pr-2 py-1 rounded text-xs w-full" style={{ background: '#161b22', border: '1px solid #21262d', color: '#c9d1d9', outline: 'none' }} />
            </div>
            <span className="text-xs" style={{ color: '#8b949e' }}>{filteredSorted.length} results</span>
          </div>

          {/* SCROLLABLE AREA */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="m-4 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: '#f87171' }}>API Error</div>
                <div className="text-xs" style={{ color: '#8b949e' }}>{error}</div>
                <button onClick={() => fetchListings(zip)} className="mt-2 text-xs px-3 py-1 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>Retry</button>
              </div>
            )}

            {loading ? <LoadingSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ minWidth: 960, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                      {[
                        { key: 'address', label: 'Address' }, { key: 'beds', label: 'Beds' }, { key: 'baths', label: 'Baths' },
                        { key: 'monthlyRent', label: 'LT Rent' }, { key: 'projectedAirbnb', label: 'Proj. STR Rev' },
                        { key: 'spread', label: 'Spread' }, { key: 'margin', label: 'Margin' },
                        { key: 'occupancyRate', label: 'Base Occ %' }, { key: 'profitScore', label: 'Score' },
                        { key: 'outreachStatus', label: 'Outreach' }, { key: null, label: 'Action' },
                      ].map(col => (
                        <th key={col.key || 'action'} onClick={() => col.key && toggleSort(col.key)}
                          className="px-3 py-3 text-left font-semibold select-none"
                          style={{ color: sort.col === col.key ? '#00d4b8' : '#8b949e', cursor: col.key ? 'pointer' : 'default', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {col.label}{sort.col === col.key && <span className="ml-1">{sort.dir === 'desc' ? '↓' : '↑'}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSorted.length === 0 ? (
                      <tr><td colSpan={11} className="px-4 py-12 text-center text-sm" style={{ color: '#8b949e' }}>
                        No properties match your filters.
                      </td></tr>
                    ) : filteredSorted.map(prop => {
                      const isTop = top5ids.has(prop.id)
                      const isLow = prop.profitScore <= 3
                      const isSelected = selected?.id === prop.id
                      return (
                        <tr key={prop.id}
                          className={`${isTop ? 'row-top' : isLow ? 'row-low' : ''} transition-colors cursor-pointer`}
                          style={{ borderBottom: '1px solid rgba(33,38,45,0.8)', background: isSelected ? 'rgba(0,212,184,0.1)' : undefined, boxShadow: isSelected ? 'inset 2px 0 0 #00d4b8' : undefined }}
                          onClick={() => { setSelected(prop); setOccupancy(prop.occupancyRate) }}
                        >
                          <td className="px-3 py-2.5" style={{ color: '#e6edf3', fontWeight: 500 }}>
                            {prop.address}{isTop && <span className="ml-1.5 text-xs" style={{ color: '#00d4b8' }}>★</span>}
                          </td>
                          <td className="px-3 py-2.5" style={{ color: '#8b949e' }}>{prop.beds}</td>
                          <td className="px-3 py-2.5" style={{ color: '#8b949e' }}>{prop.baths}</td>
                          <td className="px-3 py-2.5" style={{ color: '#c9d1d9' }}>{fmt(prop.monthlyRent)}</td>
                          <td className="px-3 py-2.5" style={{ color: '#4ade80' }}>{fmt(prop.projectedAirbnb)}</td>
                          <td className="px-3 py-2.5 font-bold" style={{ color: '#00d4b8', fontFamily: "'Syne', sans-serif" }}>{fmt(prop.spread)}</td>
                          <td className="px-3 py-2.5" style={{ color: prop.margin >= 50 ? '#00d4b8' : prop.margin >= 40 ? '#fbbf24' : '#f87171' }}>{prop.margin.toFixed(1)}%</td>
                          <td className="px-3 py-2.5" style={{ color: '#c9d1d9' }}>{prop.occupancyRate}%</td>
                          <td className="px-3 py-2.5"><ScoreBadge score={prop.profitScore} /></td>
                          <td className="px-3 py-2.5">
                            <span className={`${STATUS_CLASS[prop.outreachStatus]} px-2 py-0.5 rounded-full text-xs font-semibold`}>
                              {STATUS_LABELS[prop.outreachStatus]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button className="px-3 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: 'rgba(0,212,184,0.15)', border: '1px solid rgba(0,212,184,0.3)', color: '#00d4b8' }}
                              onClick={e => { e.stopPropagation(); setSelected(prop); setOccupancy(prop.occupancyRate) }}>
                              View Deal →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ACTIVITY LOG */}
            <div className="m-4 rounded-xl overflow-hidden" style={{ border: '1px solid #21262d' }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                <div className="flex gap-1.5">
                  {['#f87171','#fbbf24','#4ade80'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: '#8b949e' }}>ARBIHOST — LIVE ACTIVITY LOG</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full scan-pulse" style={{ background: '#00d4b8' }} />
                  <span className="text-xs font-mono" style={{ color: '#00d4b8' }}>CONNECTED</span>
                </div>
              </div>
              <div ref={logRef} className="terminal-text p-4" style={{ background: '#0d1117', height: 160, overflowY: 'auto', color: '#4ade80' }}>
                {logs.map((line, i) => <div key={i} style={{ marginBottom: 2 }}><span style={{ color: '#8b949e', marginRight: 8 }}>›</span>{line}</div>)}
                <span className="cursor-blink" style={{ color: '#00d4b8' }}>█</span>
              </div>
            </div>
          </div>
        </div>

        {/* DEAL DETAIL PANEL */}
        {selected && (
          <div className="slide-in-right flex flex-col overflow-y-auto" style={{ width: 420, minWidth: 420, background: '#161b22', borderLeft: '1px solid #21262d', flexShrink: 0 }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #21262d', background: '#0d1117' }}>
              <div>
                <div className="font-bold text-sm" style={{ color: '#e6edf3', fontFamily: "'Syne', sans-serif" }}>Deal Analysis</div>
                <div className="text-xs mt-0.5" style={{ color: '#8b949e' }}>{selected.address}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: '#8b949e', fontSize: 20 }}>×</button>
            </div>
            <div className="p-5 space-y-5">
              {/* Property summary */}
              <div className="rounded-xl p-4" style={{ background: '#1c2333', border: '1px solid #21262d' }}>
                <div className="grid grid-cols-3 gap-3">
                  {[{ l: 'Beds', v: selected.beds }, { l: 'Baths', v: selected.baths }, { l: 'Sqft', v: selected.sqft ? selected.sqft.toLocaleString() : '—' },
                    { l: 'LT Rent', v: fmt(selected.monthlyRent) }, { l: 'Property Type', v: selected.propertyType }, { l: 'DOM', v: `${selected.daysOnMarket}d` }
                  ].map(item => (
                    <div key={item.l}>
                      <div className="text-xs" style={{ color: '#8b949e' }}>{item.l}</div>
                      <div className="text-sm font-semibold mt-0.5" style={{ color: '#e6edf3' }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STR methodology note */}
              <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(0,212,184,0.06)', border: '1px solid rgba(0,212,184,0.12)' }}>
                <span style={{ color: '#00d4b8', fontWeight: 600 }}>Revenue methodology: </span>
                <span style={{ color: '#8b949e' }}>LT Rent × {STR_MULTIPLIER_BY_BED[selected.beds] || 2.1}x market multiplier × seasonal factor. Adjust in vite.config for your market.</span>
              </div>

              {/* Occupancy slider */}
              <div className="rounded-xl p-4" style={{ background: '#1c2333', border: '1px solid #21262d' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#8b949e' }}>Occupancy Assumption</span>
                  <span className="font-bold text-lg font-mono" style={{ color: '#00d4b8' }}>{currentOcc}%</span>
                </div>
                <input type="range" min={60} max={95} step={1} value={currentOcc} onChange={e => setOccupancy(Number(e.target.value))} />
                <div className="flex justify-between text-xs mt-1" style={{ color: '#30363d' }}><span>60%</span><span>95%</span></div>
                <div className="mt-2 text-xs text-center" style={{ color: '#8b949e' }}>
                  Break-even: <span style={{ color: breakEven <= currentOcc ? '#4ade80' : '#f87171', fontWeight: 700 }}>{breakEven}% occupancy</span>
                </div>
              </div>

              {/* Profit breakdown */}
              {profitData && (
                <div className="rounded-xl p-4" style={{ background: '#1c2333', border: '1px solid #21262d' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8b949e' }}>Monthly Breakdown</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Gross STR Revenue', val: profitData.gross, color: '#4ade80' },
                      { label: 'Platform Fees (15%)', val: -profitData.platform, color: '#f87171' },
                      { label: `Cleaning & Turnover`, val: -profitData.cleaning, color: '#f87171' },
                      { label: 'Utilities (est.)', val: -profitData.utilities, color: '#f87171' },
                      { label: 'Monthly Rent', val: -selected.monthlyRent, color: '#f87171' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span style={{ color: '#8b949e' }}>{row.label}</span>
                        <span style={{ color: row.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                          {row.val >= 0 ? '+' : '-'}{fmt(row.val)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: '#21262d' }}>
                      <span className="font-bold text-sm" style={{ color: '#e6edf3' }}>NET Monthly Profit</span>
                      <span className="font-bold text-2xl font-mono" style={{ color: profitData.net >= 0 ? '#00d4b8' : '#f87171', fontFamily: "'Syne', sans-serif" }}>
                        {profitData.net >= 0 ? '+' : '-'}{fmt(profitData.net)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue chart */}
              <div className="rounded-xl p-4" style={{ background: '#1c2333', border: '1px solid #21262d' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8b949e' }}>12-Month Revenue Projection</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                    <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#00d4b8' }} labelStyle={{ color: '#8b949e' }} formatter={v => [fmt(v), 'Revenue']} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.revenue > (selected.projectedAirbnb * 1.05) ? '#00d4b8' : 'rgba(0,212,184,0.4)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Outreach email */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,212,184,0.2)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(0,212,184,0.08)', borderBottom: '1px solid rgba(0,212,184,0.15)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#00d4b8' }}>Outreach Email Template</span>
                </div>
                <div className="p-4" style={{ background: '#1c2333' }}>
                  <div className="text-xs leading-relaxed overflow-hidden" style={{ color: '#c9d1d9', maxHeight: 120, WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent)' }}>
                    {generateEmail(selected).split('\n').slice(2, 8).join('\n')}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={copyEmail} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: 'rgba(0,212,184,0.15)', border: '1px solid rgba(0,212,184,0.3)', color: '#00d4b8' }}>
                      {copied ? '✓ Copied!' : '📋 Copy Email'}
                    </button>
                    <button onClick={() => handleMarkSent(selected.id)}
                      disabled={selected.outreachStatus === 'SENT' || selected.outreachStatus === 'REPLIED'}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                      📨 Mark as Sent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SCAN MODAL */}
      {scanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#161b22', border: '1px solid #21262d' }}>
            <div className="flex items-center justify-between mb-6">
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#00d4b8' }}>⚡ Configure Scan</span>
              <button onClick={() => setScanModal(false)} style={{ color: '#8b949e', fontSize: 20 }}>×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#8b949e' }}>Target ZIP Code</label>
                <input type="text" value={zipInput} onChange={e => setZipInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#1c2333', border: '1px solid #21262d', color: '#e6edf3', outline: 'none' }} />
              </div>
              <div className="rounded-lg p-3 text-xs" style={{ background: '#1c2333', color: '#8b949e' }}>
                Fetches live rental listings from Rentcast API for the specified ZIP. Uses your RENTCAST_API_KEY configured in .env.
              </div>
              <button onClick={handleScan}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style={{ background: '#00d4b8', color: '#0d1117', fontFamily: "'Syne', sans-serif", letterSpacing: '1px' }}>
                ▶ START SCAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
