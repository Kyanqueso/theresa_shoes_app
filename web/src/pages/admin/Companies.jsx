import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Building2, Pencil, Trash2 } from 'lucide-react'
import ListToolbar from '../../components/ListToolbar.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Pagination from '../../components/Pagination.jsx'
import Modal from '../../components/manage/Modal.jsx'
import ConfirmButton from '../../components/ConfirmButton.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import { createCompany, deleteCompany, listCompanies, updateCompany } from '../../lib/companiesApi.js'
import { sanitizeText } from '../../lib/textInput.js'
import { usePagination } from '../../lib/usePagination.js'

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CompanyForm({ initial, onCancel, onSave, saving, error }) {
  const [name, setName] = useState(initial?.name ?? '')
  const isEdit = Boolean(initial)

  return (
    <div className="flex flex-col gap-4 text-left">
      <div>
        <label className="text-sm font-semibold text-black">Company Name</label>
        <input
          type="text"
          value={name}
          maxLength={50}
          onChange={(event) => setName(sanitizeText(event.target.value))}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      <div className="mt-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim() || saving}
          onClick={() => onSave(name.trim())}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  )
}

export default function Companies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [activeTab, setActiveTab] = useState('active')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [modalMode, setModalMode] = useState(null) // null | 'add' | company being edited
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const refresh = (isCancelled = () => false) => {
    listCompanies()
      .then((data) => {
        if (isCancelled()) return
        setCompanies(data)
        setLoadError(null)
      })
      .catch(() => {
        if (!isCancelled()) setLoadError('Could not load companies right now.')
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
  }, [])

  const visible = useMemo(() => {
    const wantedStatus = activeTab === 'active' ? 'active' : 'archive'
    const filtered = companies
      .filter((company) => company.status === wantedStatus)
      .filter((company) => company.name.toLowerCase().includes(search.trim().toLowerCase()))
    return [...filtered].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'az') return a.name.localeCompare(b.name)
      if (sort === 'za') return b.name.localeCompare(a.name)
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [companies, activeTab, search, sort])

  const pagination = usePagination(visible.length)
  const pageItems = pagination.slice(visible)

  const closeModal = () => {
    setModalMode(null)
    setFormError(null)
  }

  const handleSave = async (name) => {
    setSaving(true)
    setFormError(null)
    try {
      if (modalMode === 'add') {
        await createCompany({ name })
      } else {
        await updateCompany(modalMode.id, { name })
      }
      closeModal()
      refresh()
    } catch {
      setFormError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (company) => {
    try {
      await updateCompany(company.id, { status: 'archive' })
      refresh()
    } catch {
      setLoadError('Could not archive that company. Please try again.')
    }
  }

  const handleRestore = async (company) => {
    try {
      await updateCompany(company.id, { status: 'active' })
      refresh()
    } catch {
      setLoadError('Could not restore that company. Please try again.')
    }
  }

  const handleDelete = async (company) => {
    try {
      await deleteCompany(company.id)
      refresh()
    } catch {
      setLoadError('Could not delete that company. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-black">Companies</h1>

      <ListToolbar
        searchPlaceholder="Search Company Name..."
        search={search}
        onSearchChange={setSearch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sort={sort}
        onSortChange={setSort}
        showAddButton
        addLabel="Add New Company"
        onAdd={() => setModalMode('add')}
      />

      <div className="mt-8">
        {isLoading ? (
          <LoadingSpinner label="Loading Companies..." />
        ) : loadError ? (
          <p className="text-center text-danger">{loadError}</p>
        ) : pageItems.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={activeTab === 'active' ? 'No companies yet' : 'No archived companies'}
            message={
              activeTab === 'active'
                ? "You haven't added any companies yet."
                : 'Companies you archive will show up here.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pageItems.map((company) => (
              <div key={company.id} className="relative rounded-xl bg-accent p-5">
                <div className="absolute right-3 top-3 flex gap-2">
                  {activeTab === 'active' ? (
                    <>
                      <button
                        type="button"
                        aria-label="Edit company"
                        onClick={() => setModalMode(company)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white transition-opacity hover:opacity-90"
                      >
                        <Pencil size={12} />
                      </button>
                      <ConfirmButton
                        label=""
                        icon={Archive}
                        iconSize={12}
                        ariaLabel="Archive company"
                        question={`Archive "${company.name}"? You can restore it later from the Archive tab.`}
                        onConfirm={() => handleArchive(company)}
                        triggerClassName="flex h-6 w-6 items-center justify-center rounded-md bg-danger text-white transition-opacity hover:opacity-90"
                      />
                    </>
                  ) : (
                    <>
                      <ConfirmButton
                        label="Restore"
                        question={`Restore "${company.name}" to active companies?`}
                        onConfirm={() => handleRestore(company)}
                        triggerClassName="rounded-lg bg-golden-brown px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      />
                      <ConfirmButton
                        label=""
                        icon={Trash2}
                        iconSize={14}
                        ariaLabel="Permanently delete company"
                        question={`Permanently delete "${company.name}"? This also deletes all of its orders and payment records. This can't be undone.`}
                        onConfirm={() => handleDelete(company)}
                        triggerClassName="flex h-8 w-8 items-center justify-center rounded-md bg-danger text-white transition-opacity hover:opacity-90"
                      />
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/companies/${company.id}/orders`)}
                  className="block w-full text-left"
                >
                  <h3 className="mt-6 text-xl font-bold text-black hover:underline">{company.name}</h3>
                  <p className="mt-8 text-xs text-gray-500">
                    {activeTab === 'active'
                      ? `Added on ${formatDate(company.created_at)}`
                      : `Archived on ${formatDate(company.archived_at)}`}
                  </p>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination
        totalCount={visible.length}
        page={pagination.page}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />

      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'add' ? 'Add New Company' : 'Edit Company'}
      >
        <CompanyForm
          initial={modalMode === 'add' ? null : modalMode}
          onCancel={closeModal}
          onSave={handleSave}
          saving={saving}
          error={formError}
        />
      </Modal>
    </div>
  )
}
