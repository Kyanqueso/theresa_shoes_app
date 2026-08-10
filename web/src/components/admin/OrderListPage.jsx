import { useEffect, useMemo, useState } from 'react'
import { Archive, ArrowRightLeft, Package, Share2, Trash2 } from 'lucide-react'
import ListToolbar from '../ListToolbar.jsx'
import DataTable from '../DataTable.jsx'
import Pagination from '../Pagination.jsx'
import ConfirmButton from '../ConfirmButton.jsx'
import ShareOrderOverlay from '../ShareOrderOverlay.jsx'
import TransferOrderOverlay from '../TransferOrderOverlay.jsx'
import NotesViewOverlay from '../NotesViewOverlay.jsx'
import AddOrderOverlay from './AddOrderOverlay.jsx'
import LoadingSpinner from '../LoadingSpinner.jsx'
import { listCompanies } from '../../lib/companiesApi.js'
import { listOrders, updateOrder, deleteOrder } from '../../lib/ordersApi.js'
import { listShoes } from '../../lib/shoesApi.js'
import { listAttributeOptions } from '../../lib/attributesApi.js'
import { sanitizeText } from '../../lib/textInput.js'
import { usePagination } from '../../lib/usePagination.js'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortId(id) {
  return `#${id.slice(0, 8)}`
}

function buildOrderSummary(order, { companyName, shoeName, materialName, moldName, heelName }) {
  const lines = [
    `${shoeName} - ₱${Number(order.unit_price).toLocaleString()} each`,
    `Client: ${order.client_name}`,
    companyName && `Company: ${companyName}`,
    order.contact_number && `Contact #: ${order.contact_number}`,
    materialName && `Material: ${materialName}`,
    order.color_code && `Color/Code: ${order.color_code}`,
    moldName && `Mold Type: ${moldName}`,
    heelName && `Heel Type: ${heelName}`,
    `Buckle: ${order.with_buckle ? 'Yes' : 'No'}`,
    `Flatform: ${order.with_flatform ? 'Yes' : 'No'}`,
    `Slingback: ${order.with_slingback ? 'Yes' : 'No'}`,
    order.size && `Size: ${order.size}`,
    order.heel_size && `Heel Size: ${order.heel_size}`,
    `Quantity: ${order.quantity}`,
    `Total: ₱${(order.unit_price * order.quantity).toLocaleString()}`,
  ].filter(Boolean)
  return lines.join('\n')
}

/** Shared table for both the Orders page (current/archived tabs) and Complete Orders (fixed, no tabs). */
export default function OrderListPage({ companyId, mode }) {
  const [companyName, setCompanyName] = useState('')
  const [orders, setOrders] = useState([])
  const [shoes, setShoes] = useState([])
  const [attributeOptions, setAttributeOptions] = useState({})
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeTab, setActiveTab] = useState('active')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [isSavingEdits, setIsSavingEdits] = useState(false)

  const [shareOrder, setShareOrder] = useState(null)
  const [transferOrder, setTransferOrder] = useState(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [notesOrder, setNotesOrder] = useState(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const refresh = (isCancelled = () => false) => {
    Promise.all([listOrders({ companyId }), listShoes(), listAttributeOptions(), listCompanies()])
      .then(([ordersData, shoesData, attributesData, companiesData]) => {
        if (isCancelled()) return
        setOrders(ordersData)
        setShoes(shoesData)
        const grouped = attributesData.reduce((acc, option) => {
          acc[option.category] = acc[option.category] ?? []
          acc[option.category].push(option)
          return acc
        }, {})
        setAttributeOptions(grouped)
        setCompanies(companiesData)
        const company = companiesData.find((item) => item.id === companyId)
        setCompanyName(company?.name ?? 'Company')
        setLoadError(null)
      })
      .catch(() => {
        if (!isCancelled()) setLoadError('Could not load orders right now.')
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

  // Manually-entered orders may not reference a real catalog shoe — fall back to the typed name.
  const modelName = (order) =>
    (order.shoe_id ? shoes.find((shoe) => shoe.id === order.shoe_id)?.name : order.custom_model_name) ?? '—'
  const optionName = (category, id) =>
    (attributeOptions[category] ?? []).find((option) => option.id === id)?.name ?? '—'

  const isArchiveTab = activeTab === 'archive'

  // A single order.status can't be both "completed" and "archived" at once, so archived
  // orders are told apart by whether completed_at survived from before they were archived —
  // that way archiving from Orders vs. from Complete Orders lands in the right archive tab.
  const matchesView = (order) => {
    if (mode === 'completed') {
      return isArchiveTab ? order.status === 'archived' && order.completed_at != null : order.status === 'completed'
    }
    return isArchiveTab ? order.status === 'archived' && order.completed_at == null : order.status === 'current'
  }

  const visible = useMemo(() => {
    const filtered = orders
      .filter(matchesView)
      .filter((order) => order.client_name.toLowerCase().includes(search.trim().toLowerCase()))
    return [...filtered].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'az') return a.client_name.localeCompare(b.client_name)
      if (sort === 'za') return b.client_name.localeCompare(a.client_name)
      return new Date(b.created_at) - new Date(a.created_at)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, mode, isArchiveTab, search, sort])

  const pagination = usePagination(visible.length)
  const pageItems = pagination.slice(visible)

  const handleEnterEdit = () => {
    const seed = {}
    for (const order of pageItems) {
      seed[order.id] = {
        client_name: order.client_name,
        contact_number: order.contact_number ?? '',
        material_id: order.material_id ?? '',
        color_code: order.color_code ?? '',
        mold_type_id: order.mold_type_id ?? '',
        heel_type_id: order.heel_type_id ?? '',
        size: order.size ?? '',
        heel_size: order.heel_size ?? '',
        with_buckle: order.with_buckle,
        with_flatform: order.with_flatform,
        with_slingback: order.with_slingback,
        quantity: order.quantity,
        unit_price: order.unit_price,
      }
    }
    setDrafts(seed)
    setIsEditing(true)
  }

  const handleCancelEdits = () => {
    setIsEditing(false)
    setDrafts({})
  }

  const updateDraft = (orderId, field, value) => {
    setDrafts((current) => ({ ...current, [orderId]: { ...current[orderId], [field]: value } }))
  }

  const handleSaveEdits = async () => {
    setIsSavingEdits(true)
    try {
      await Promise.all(
        Object.entries(drafts).map(([orderId, draft]) =>
          updateOrder(orderId, {
            client_name: draft.client_name.trim(),
            contact_number: draft.contact_number.trim() || null,
            material_id: draft.material_id || null,
            color_code: draft.color_code.trim() || null,
            mold_type_id: draft.mold_type_id || null,
            heel_type_id: draft.heel_type_id || null,
            size: draft.size === '' ? null : Number(draft.size),
            heel_size: draft.heel_size === '' ? null : Number(draft.heel_size),
            with_buckle: draft.with_buckle,
            with_flatform: draft.with_flatform,
            with_slingback: draft.with_slingback,
            quantity: Number(draft.quantity) || 1,
            unit_price: Number(draft.unit_price) || 0,
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

  const handleArchive = async (order) => {
    try {
      await updateOrder(order.id, { status: 'archived' })
      refresh()
    } catch {
      setLoadError('Could not archive that order. Please try again.')
    }
  }

  const handleRestore = async (order) => {
    // Restore to wherever it came from: a previously-completed order goes back to
    // Completed, a previously-current one goes back to Current.
    try {
      await updateOrder(order.id, { status: order.completed_at ? 'completed' : 'current' })
      refresh()
    } catch {
      setLoadError('Could not restore that order. Please try again.')
    }
  }

  const handleDelete = async (order) => {
    try {
      await deleteOrder(order.id)
      refresh()
    } catch {
      setLoadError('Could not delete that order. Please try again.')
    }
  }

  const handleTransferConfirm = async (newCompanyId) => {
    setIsTransferring(true)
    try {
      await updateOrder(transferOrder.id, { company_id: newCompanyId })
      setTransferOrder(null)
      refresh()
    } catch {
      setLoadError('Could not transfer that order. Please try again.')
    } finally {
      setIsTransferring(false)
    }
  }

  const inputClass =
    'w-full min-w-[6rem] rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary/30'

  const textField = (order, field, width = '') => (
    <input
      type="text"
      maxLength={50}
      value={drafts[order.id]?.[field] ?? ''}
      onChange={(event) => updateDraft(order.id, field, sanitizeText(event.target.value))}
      className={`${inputClass} ${width}`}
    />
  )

  const numberField = (order, field, width = 'w-16') => (
    <input
      type="number"
      value={drafts[order.id]?.[field] ?? ''}
      onChange={(event) => updateDraft(order.id, field, event.target.value)}
      className={`${inputClass} ${width}`}
    />
  )

  const optionField = (order, field, category) => (
    <select
      value={drafts[order.id]?.[field] ?? ''}
      onChange={(event) => updateDraft(order.id, field, event.target.value)}
      className={inputClass}
    >
      <option value="">—</option>
      {(attributeOptions[category] ?? []).map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  )

  const yesNoField = (order, field) => (
    <select
      value={drafts[order.id]?.[field] ? 'yes' : 'no'}
      onChange={(event) => updateDraft(order.id, field, event.target.value === 'yes')}
      className={inputClass}
    >
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  )

  const rows = pageItems.map((order) => ({
    id: shortId(order.id),
    clientName: isEditing ? textField(order, 'client_name') : order.client_name,
    contactNumber: isEditing ? textField(order, 'contact_number') : order.contact_number || '—',
    modelOrdered: modelName(order),
    orderDate: formatDate(order.created_at),
    ...(mode === 'completed' ? { completedDate: formatDate(order.completed_at) } : {}),
    ...(isArchiveTab ? { archivedDate: formatDate(order.archived_at) } : {}),
    size: isEditing ? numberField(order, 'size', 'w-12') : order.size ?? '—',
    material: isEditing ? optionField(order, 'material_id', 'material') : optionName('material', order.material_id),
    color: isEditing ? textField(order, 'color_code', 'w-16') : order.color_code || '—',
    mold: isEditing ? optionField(order, 'mold_type_id', 'mold_type') : optionName('mold_type', order.mold_type_id),
    heelType: isEditing
      ? optionField(order, 'heel_type_id', 'heel_type')
      : optionName('heel_type', order.heel_type_id),
    heelSize: isEditing ? numberField(order, 'heel_size', 'w-12') : order.heel_size ?? '—',
    buckle: isEditing ? yesNoField(order, 'with_buckle') : order.with_buckle ? 'Yes' : 'No',
    flatform: isEditing ? yesNoField(order, 'with_flatform') : order.with_flatform ? 'Yes' : 'No',
    slingback: isEditing ? yesNoField(order, 'with_slingback') : order.with_slingback ? 'Yes' : 'No',
    quantity: isEditing ? numberField(order, 'quantity', 'w-12') : order.quantity,
    price: isEditing ? numberField(order, 'unit_price', 'w-16') : Number(order.unit_price).toLocaleString(),
    notes: (
      <button
        type="button"
        onClick={() => setNotesOrder(order)}
        className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-black transition-opacity hover:opacity-80"
      >
        View Notes
      </button>
    ),
    actions: isEditing ? null : isArchiveTab ? (
      <div className="flex items-center gap-1.5">
        <ConfirmButton
          label="Restore"
          question={`Restore ${order.client_name}'s order?`}
          onConfirm={() => handleRestore(order)}
          triggerClassName="rounded-lg bg-golden-brown px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        />
        <ConfirmButton
          label=""
          icon={Trash2}
          iconSize={14}
          ariaLabel="Permanently delete order"
          question={`Permanently delete ${order.client_name}'s order? This can't be undone.`}
          onConfirm={() => handleDelete(order)}
          triggerClassName="flex h-8 w-8 items-center justify-center rounded-md bg-danger text-white transition-opacity hover:opacity-90"
        />
      </div>
    ) : (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Share order"
          onClick={() => setShareOrder(order)}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500 text-white transition-opacity hover:opacity-90"
        >
          <Share2 size={13} />
        </button>
        <button
          type="button"
          aria-label="Transfer order"
          onClick={() => setTransferOrder(order)}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-600 text-white transition-opacity hover:opacity-90"
        >
          <ArrowRightLeft size={13} />
        </button>
        <ConfirmButton
          label=""
          icon={Archive}
          ariaLabel="Archive order"
          question={`Archive ${order.client_name}'s order? You can restore it later.`}
          onConfirm={() => handleArchive(order)}
          triggerClassName="flex h-7 w-7 items-center justify-center rounded-md bg-danger text-white transition-opacity hover:opacity-90"
        />
      </div>
    ),
  }))

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'clientName', label: 'Client Name' },
    { key: 'contactNumber', label: 'Contact Number' },
    { key: 'modelOrdered', label: 'Model Ordered' },
    { key: 'orderDate', label: 'Order Date' },
    ...(mode === 'completed' ? [{ key: 'completedDate', label: 'Completed Date' }] : []),
    ...(isArchiveTab ? [{ key: 'archivedDate', label: 'Archived Date' }] : []),
    { key: 'size', label: 'Size' },
    { key: 'material', label: 'Material' },
    { key: 'color', label: 'Color' },
    { key: 'mold', label: 'Mold' },
    { key: 'heelType', label: 'Heel Type' },
    { key: 'heelSize', label: 'Heel Size' },
    { key: 'buckle', label: 'Buckle' },
    { key: 'flatform', label: 'Flatform' },
    { key: 'slingback', label: 'Slingback' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'price', label: 'Price' },
    { key: 'notes', label: 'Notes' },
    { key: 'actions', label: 'Action' },
  ]

  const heading = mode === 'completed' ? `${companyName}'s Completed Orders` : `${companyName}'s Orders`

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-black">{heading}</h1>

      <ListToolbar
        searchPlaceholder="Search Client Name..."
        search={search}
        onSearchChange={setSearch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sort={sort}
        onSortChange={setSort}
        showAddButton={mode === 'orders'}
        addLabel="Add New Order"
        onAdd={() => setIsAddOpen(true)}
        showEditButton={!isArchiveTab}
        isEditing={isEditing}
        onEnterEdit={handleEnterEdit}
        onSaveEdits={handleSaveEdits}
        onCancelEdits={handleCancelEdits}
        isSavingEdits={isSavingEdits}
      />

      <div className="mt-8">
        {isLoading ? (
          <LoadingSpinner label={mode === 'completed' ? 'Loading Completed Orders...' : 'Loading Current Orders...'} />
        ) : loadError ? (
          <p className="text-center text-danger">{loadError}</p>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            emptyIcon={Package}
            emptyTitle={isArchiveTab ? 'No archived orders' : 'No orders yet'}
            emptyMessage={
              isArchiveTab
                ? 'Orders you archive will show up here.'
                : mode === 'completed'
                  ? 'Finished orders for this company will appear here.'
                  : "This company hasn't placed any orders yet."
            }
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

      <ShareOrderOverlay
        isOpen={shareOrder !== null}
        onClose={() => setShareOrder(null)}
        summaryText={
          shareOrder
            ? buildOrderSummary(shareOrder, {
                companyName,
                shoeName: modelName(shareOrder),
                materialName: optionName('material', shareOrder.material_id),
                moldName: optionName('mold_type', shareOrder.mold_type_id),
                heelName: optionName('heel_type', shareOrder.heel_type_id),
              })
            : ''
        }
      />

      <TransferOrderOverlay
        isOpen={transferOrder !== null}
        onClose={() => setTransferOrder(null)}
        companies={companies}
        currentCompanyId={companyId}
        onConfirm={handleTransferConfirm}
        isSubmitting={isTransferring}
      />

      <NotesViewOverlay isOpen={notesOrder !== null} onClose={() => setNotesOrder(null)} blocks={notesOrder?.notes_blocks ?? []} />

      <AddOrderOverlay
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        companyId={companyId}
        attributeOptions={attributeOptions}
        onCreated={refresh}
      />
    </div>
  )
}
