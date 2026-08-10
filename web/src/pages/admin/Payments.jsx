import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import ListToolbar from '../../components/ListToolbar.jsx'
import DataTable from '../../components/DataTable.jsx'
import Pagination from '../../components/Pagination.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import { listCompanies } from '../../lib/companiesApi.js'
import { listOrders } from '../../lib/ordersApi.js'
import { listPayments, updatePayment } from '../../lib/paymentsApi.js'
import { usePagination } from '../../lib/usePagination.js'
import { paymentFulfillment, PAYMENT_STATUS } from '../../lib/paymentStatus.js'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatAmount(value) {
  const number = Number(value)
  if (!number) return '-'
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function shortId(id) {
  return `#${id.slice(0, 8)}`
}

const inputClass =
  'w-full min-w-[6rem] rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary/30'

export default function Payments() {
  const { companyId } = useParams()
  const [companyName, setCompanyName] = useState('')
  const [payments, setPayments] = useState([])
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeTab, setActiveTab] = useState('active')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [isSavingEdits, setIsSavingEdits] = useState(false)

  const refresh = (isCancelled = () => false) => {
    Promise.all([listPayments({ companyId }), listOrders({ companyId }), listCompanies()])
      .then(([paymentsData, ordersData, companiesData]) => {
        if (isCancelled()) return
        setPayments(paymentsData)
        setOrders(ordersData)
        const company = companiesData.find((item) => item.id === companyId)
        setCompanyName(company?.name ?? 'Company')
        setLoadError(null)
      })
      .catch(() => {
        if (!isCancelled()) setLoadError('Could not load payments right now.')
      })
      .finally(() => {
        if (!isCancelled()) setIsLoading(false)
      })
  }

  useEffect(() => {
    let cancelled = false
    refresh(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [companyId])

  const orderFor = (orderId) => orders.find((order) => order.id === orderId)
  const orderDate = (orderId) => orderFor(orderId)?.created_at
  const isArchiveTab = activeTab === 'archive'

  const visible = useMemo(() => {
    const filtered = payments
      .filter((payment) => {
        const isArchived = orderFor(payment.order_id)?.status === 'archived'
        return isArchiveTab ? isArchived : !isArchived
      })
      .filter((payment) => (payment.client_name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    return [...filtered].sort((a, b) => {
      if (sort === 'az') return (a.client_name ?? '').localeCompare(b.client_name ?? '')
      if (sort === 'za') return (b.client_name ?? '').localeCompare(a.client_name ?? '')
      const dateA = orderFor(a.order_id)?.created_at
      const dateB = orderFor(b.order_id)?.created_at
      if (sort === 'oldest') return new Date(dateA) - new Date(dateB)
      return new Date(dateB) - new Date(dateA)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, orders, isArchiveTab, search, sort])

  const pagination = usePagination(visible.length)
  const pageItems = pagination.slice(visible)

  const handleEnterEdit = () => {
    const seed = {}
    for (const payment of pageItems) {
      seed[payment.id] = {
        date_delivered: payment.date_delivered ?? '',
        first_payment: payment.first_payment ?? 0,
        second_payment: payment.second_payment ?? 0,
        third_payment: payment.third_payment ?? 0,
      }
    }
    setDrafts(seed)
    setIsEditing(true)
  }

  const handleCancelEdits = () => {
    setIsEditing(false)
    setDrafts({})
  }

  const updateDraft = (paymentId, field, value) => {
    setDrafts((current) => ({ ...current, [paymentId]: { ...current[paymentId], [field]: value } }))
  }

  const handleSaveEdits = async () => {
    setIsSavingEdits(true)
    try {
      await Promise.all(
        Object.entries(drafts).map(([paymentId, draft]) =>
          updatePayment(paymentId, {
            date_delivered: draft.date_delivered || null,
            first_payment: Number(draft.first_payment) || 0,
            second_payment: Number(draft.second_payment) || 0,
            third_payment: Number(draft.third_payment) || 0,
          }),
        ),
      )
      setIsEditing(false)
      setDrafts({})
      refresh()
    } catch {
      setLoadError('Could not save some changes. Please try again.')
    } finally {
      setIsSavingEdits(false)
    }
  }

  const dateField = (payment) => (
    <input
      type="date"
      value={drafts[payment.id]?.date_delivered ?? ''}
      onChange={(event) => updateDraft(payment.id, 'date_delivered', event.target.value)}
      className={inputClass}
    />
  )

  const payField = (payment, field) => (
    <input
      type="number"
      min={0}
      step="0.01"
      value={drafts[payment.id]?.[field] ?? 0}
      onChange={(event) => updateDraft(payment.id, field, event.target.value)}
      className={`${inputClass} w-20`}
    />
  )

  const rows = pageItems.map((payment) => {
    const isDelivered = Boolean(payment.date_delivered)
    const isPaid = Number(payment.balance) <= 0

    return {
      // Same ID as the order everywhere — an order and its payment are one record, not two.
      id: shortId(payment.order_id),
      clientName: payment.client_name || '—',
      totalAmount: Number(payment.total_amount).toLocaleString(),
      orderDate: formatDate(orderDate(payment.order_id)),
      dateDelivered: isEditing ? dateField(payment) : formatDate(payment.date_delivered),
      firstPayment: isEditing ? payField(payment, 'first_payment') : formatAmount(payment.first_payment),
      secondPayment: isEditing ? payField(payment, 'second_payment') : formatAmount(payment.second_payment),
      thirdPayment: isEditing ? payField(payment, 'third_payment') : formatAmount(payment.third_payment),
      balance: formatAmount(payment.balance),
      balanceCleared: formatDate(payment.balance_cleared_date),
      ...(isArchiveTab ? { archivedDate: formatDate(orderFor(payment.order_id)?.archived_at) } : {}),
      _status: paymentFulfillment(isPaid, isDelivered),
    }
  })

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'totalAmount', label: 'Total Amount' },
    { key: 'orderDate', label: 'Order Date' },
    ...(isArchiveTab ? [{ key: 'archivedDate', label: 'Archived Date' }] : []),
    { key: 'dateDelivered', label: 'Date Delivered' },
    { key: 'firstPayment', label: '1st Pay' },
    { key: 'secondPayment', label: '2nd Pay' },
    { key: 'thirdPayment', label: '3rd Pay' },
    { key: 'balance', label: 'Balance' },
    { key: 'balanceCleared', label: 'Balance Cleared Date' },
  ]

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-black">{companyName}&apos;s Payment &amp; Delivery</h1>

      <ListToolbar
        searchPlaceholder="Search Client Name..."
        search={search}
        onSearchChange={setSearch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sort={sort}
        onSortChange={setSort}
        showEditButton={!isArchiveTab}
        isEditing={isEditing}
        onEnterEdit={handleEnterEdit}
        onSaveEdits={handleSaveEdits}
        onCancelEdits={handleCancelEdits}
        isSavingEdits={isSavingEdits}
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {Object.values(PAYMENT_STATUS).map((status) => (
          <div key={status.label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        ))}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <LoadingSpinner label="Loading Payment & Delivery..." />
        ) : loadError ? (
          <p className="text-center text-danger">{loadError}</p>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            emptyIcon={Wallet}
            emptyTitle={isArchiveTab ? 'No archived payments' : 'No payment records yet'}
            emptyMessage={
              isArchiveTab
                ? 'Payments for archived orders will show up here.'
                : 'Payment and delivery details will show up here once an order is placed.'
            }
            rowClassName={(row) => PAYMENT_STATUS[row._status]?.row ?? ''}
          />
        )}
      </div>

      <Pagination
        totalCount={visible.length}
        page={pagination.page}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  )
}
