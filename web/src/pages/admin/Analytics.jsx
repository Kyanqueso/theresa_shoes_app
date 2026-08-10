import { useEffect, useMemo, useState } from 'react'
import { Landmark, BadgeDollarSign, Package, Hourglass, Download, X } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import DataTable from '../../components/DataTable.jsx'
import SortSelect from '../../components/SortSelect.jsx'
import { listOrders } from '../../lib/ordersApi.js'
import { listPayments } from '../../lib/paymentsApi.js'
import { listCompanies } from '../../lib/companiesApi.js'
import { paymentFulfillment, PAYMENT_STATUS } from '../../lib/paymentStatus.js'

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const formatCompactCurrency = (value) => {
  if (value === 0) return '0'
  const thousands = (value / 1000).toFixed(1).replace(/\.0$/, '')
  return `${thousands}K`
}
const formatMoney = (value) => `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')
const formatAmount = (value) => {
  const number = Number(value)
  if (!number) return '-'
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toCsvValue(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(toCsvValue).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function Analytics() {
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [balanceSearch, setBalanceSearch] = useState('')
  const [balanceSort, setBalanceSort] = useState('newest')

  useEffect(() => {
    let cancelled = false
    Promise.all([listOrders({}), listPayments({}), listCompanies()])
      .then(([ordersData, paymentsData, companiesData]) => {
        if (cancelled) return
        setOrders(ordersData)
        setPayments(paymentsData)
        setCompanies(companiesData)
        setLoadError(null)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load analytics right now.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const year = new Date().getFullYear()
  const companyName = (id) => companies.find((company) => company.id === id)?.name ?? 'Unknown Company'

  const stats = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Archived orders/payments are excluded from every analytics figure — they're void, not history.
    const activeOrders = orders.filter((order) => order.status !== 'archived')
    const activeOrderIds = new Set(activeOrders.map((order) => order.id))
    const activePayments = payments.filter((payment) => activeOrderIds.has(payment.order_id))

    const uncollectedBalance = activePayments.reduce((sum, payment) => sum + Number(payment.balance), 0)

    const ordersThisYear = activeOrders.filter((order) => new Date(order.created_at).getFullYear() === year)
    const totalSales = ordersThisYear.reduce((sum, order) => sum + Number(order.unit_price) * order.quantity, 0)

    const ordersLast30Days = activeOrders.filter((order) => new Date(order.created_at) >= thirtyDaysAgo)
    const totalOrders = ordersLast30Days.length
    const pendingOrders = ordersLast30Days.filter((order) => order.status === 'current').length

    const monthlySales = Array.from({ length: 12 }, () => 0)
    for (const order of ordersThisYear) {
      const monthIndex = new Date(order.created_at).getMonth()
      monthlySales[monthIndex] += Number(order.unit_price) * order.quantity
    }

    return { uncollectedBalance, totalSales, totalOrders, pendingOrders, monthlySales, activeOrders, activePayments }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, payments, companies, year])

  // Every undelivered or unpaid active order — the underlying detail behind "Uncollected Balance".
  const outstandingRecords = useMemo(() => {
    const records = (stats.activeOrders ?? [])
      .map((order) => {
        const payment = (stats.activePayments ?? []).find((item) => item.order_id === order.id)
        const balance = Number(payment?.balance ?? 0)
        const isDelivered = Boolean(payment?.date_delivered)
        const isPaid = balance <= 0
        if (isPaid && isDelivered) return null
        return {
          id: order.id,
          company: order.company_id ? companyName(order.company_id) : '—',
          name: order.client_name,
          contact: order.contact_number || '—',
          orderDate: order.created_at,
          qty: order.quantity,
          price: Number(order.unit_price),
          total: Number(order.unit_price) * order.quantity,
          firstPay: Number(payment?.first_payment ?? 0),
          secondPay: Number(payment?.second_payment ?? 0),
          balance,
          isPaid,
          isDelivered,
        }
      })
      .filter(Boolean)

    const term = balanceSearch.trim().toLowerCase()
    const filtered = term
      ? records.filter(
          (record) =>
            record.company.toLowerCase().includes(term) ||
            record.name.toLowerCase().includes(term) ||
            record.contact.toLowerCase().includes(term),
        )
      : records

    return [...filtered].sort((a, b) => {
      if (balanceSort === 'az') return a.name.localeCompare(b.name)
      if (balanceSort === 'za') return b.name.localeCompare(a.name)
      if (balanceSort === 'oldest') return new Date(a.orderDate) - new Date(b.orderDate)
      return new Date(b.orderDate) - new Date(a.orderDate)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.activeOrders, stats.activePayments, companies, balanceSearch, balanceSort])

  const balanceColumns = [
    { key: 'company', label: 'Company' },
    { key: 'name', label: 'Name' },
    { key: 'contact', label: 'Contact Number' },
    { key: 'orderDate', label: 'Order Date' },
    { key: 'qty', label: 'Qty' },
    { key: 'price', label: 'Price' },
    { key: 'total', label: 'Total' },
    { key: 'firstPay', label: '1st Pay' },
    { key: 'secondPay', label: '2nd Pay' },
    { key: 'balance', label: 'Balance' },
    { key: 'status', label: 'Status' },
  ]

  const balanceRows = outstandingRecords.map((record) => {
    const status = PAYMENT_STATUS[paymentFulfillment(record.isPaid, record.isDelivered)]
    return {
      id: record.id,
      company: record.company,
      name: record.name,
      contact: record.contact,
      orderDate: formatDate(record.orderDate),
      qty: record.qty,
      price: formatAmount(record.price),
      total: formatAmount(record.total),
      firstPay: formatAmount(record.firstPay),
      secondPay: formatAmount(record.secondPay),
      balance: formatAmount(record.balance),
      status: (
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}>
          {status.label}
        </span>
      ),
    }
  })

  const chartData = MONTH_LABELS.map((month, index) => ({
    month: `${month} ${year}`,
    sales: stats.monthlySales?.[index] ?? 0,
  }))

  const STATS = [
    {
      icon: Landmark,
      label: 'Uncollected Balance',
      range: `Jan ${year} - Dec ${year}`,
      value: formatMoney(stats.uncollectedBalance ?? 0),
      action: 'View Uncollected Balance',
      onAction: () => setIsBalanceModalOpen(true),
    },
    {
      icon: BadgeDollarSign,
      label: 'Total Sales',
      range: `Jan ${year} - Dec ${year}`,
      value: formatMoney(stats.totalSales ?? 0),
    },
    {
      icon: Package,
      label: 'Total Orders',
      range: 'Last 30 Days',
      value: String(stats.totalOrders ?? 0),
    },
    {
      icon: Hourglass,
      label: 'Pending Orders',
      range: 'Last 30 Days',
      value: String(stats.pendingOrders ?? 0),
    },
  ]

  const handleDownloadReport = () => {
    const header = [
      'Order ID', 'Company', 'Client Name', 'Model Ordered', 'Status', 'Order Date',
      'Quantity', 'Unit Price', 'Total', 'Balance', 'Date Delivered',
    ]
    const rows = (stats.activeOrders ?? []).map((order) => {
      const payment = (stats.activePayments ?? []).find((item) => item.order_id === order.id)
      return [
        order.id,
        order.company_id ? companyName(order.company_id) : '—',
        order.client_name,
        order.custom_model_name ?? '—',
        order.status,
        new Date(order.created_at).toISOString().slice(0, 10),
        order.quantity,
        order.unit_price,
        Number(order.unit_price) * order.quantity,
        payment ? payment.balance : '—',
        payment?.date_delivered ?? '—',
      ]
    })
    downloadCsv(`theresa-shoes-report-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
  }

  if (isLoading) {
    return <LoadingSpinner label="Loading Analytics..." />
  }

  if (loadError) {
    return <p className="px-6 py-12 text-center text-danger">{loadError}</p>
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-black">Analytics Overview</h1>
        <button
          type="button"
          onClick={handleDownloadReport}
          className="flex items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:self-auto"
        >
          <Download size={16} />
          Download Report
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-accent p-6">
            <div className="flex items-center gap-2 text-gray-700">
              <stat.icon size={18} className="text-primary" />
              <span className="text-sm font-semibold">{stat.label}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{stat.range}</p>
            <p className="mt-3 text-2xl font-bold text-black">{stat.value}</p>
            {stat.action && (
              <button
                type="button"
                onClick={stat.onAction}
                className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {stat.action}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-black">Year to Date Sales</h2>
          <span className="text-xl font-bold text-black">{formatCompactCurrency(stats.totalSales ?? 0)}</span>
        </div>

        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value) => [`₱${value.toLocaleString()}`, 'Sales']} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#salesFill)"
                dot={{ r: 4, stroke: 'var(--color-primary)', strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-500">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-primary" />
          Total Sales Per Month
        </p>
      </div>

      {isBalanceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setIsBalanceModalOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-accent p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="w-5" />
              <h3 className="flex-1 text-center text-xl font-bold text-black">Customers with Uncollected Balance</h3>
              <button
                type="button"
                onClick={() => setIsBalanceModalOpen(false)}
                aria-label="Close"
                className="text-gray-500 hover:text-black"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={balanceSearch}
                onChange={(event) => setBalanceSearch(event.target.value)}
                placeholder="Search by company, name, or contact number..."
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-md"
              />
              <SortSelect value={balanceSort} onChange={setBalanceSort} className="sm:w-48" />
            </div>

            <div className="mt-4">
              <DataTable
                columns={balanceColumns}
                rows={balanceRows}
                emptyIcon={Landmark}
                emptyTitle="Nothing outstanding"
                emptyMessage="Every active order is fully paid and delivered."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
