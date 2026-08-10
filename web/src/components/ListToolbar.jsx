import { Check, Pencil, Plus, X } from 'lucide-react'
import SortSelect from './SortSelect.jsx'

const tabClasses = (isActive) =>
  `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm ${
    isActive ? 'bg-black text-white' : 'border border-gray-300 text-gray-500 hover:text-black'
  }`

export default function ListToolbar({
  searchPlaceholder = 'Search...',
  search = '',
  onSearchChange,
  activeTab,
  onTabChange,
  sort,
  onSortChange,
  showAddButton = false,
  addLabel = 'Add New',
  onAdd,
  showEditButton = false,
  isEditing = false,
  onEnterEdit,
  onSaveEdits,
  onCancelEdits,
  isSavingEdits = false,
}) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder={searchPlaceholder}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-64"
        />

        <SortSelect value={sort} onChange={onSortChange} />
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        {onTabChange ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onTabChange('active')}
              className={tabClasses(activeTab === 'active')}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => onTabChange('archive')}
              className={tabClasses(activeTab === 'archive')}
            >
              Archive
            </button>
          </div>
        ) : (
          <div />
        )}

        {(showAddButton || showEditButton) && (
          <div className="flex shrink-0 gap-2">
            {showAddButton && (
              <button
                type="button"
                onClick={onAdd}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-success px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">{addLabel}</span>
              </button>
            )}
            {showEditButton && !isEditing && (
              <button
                type="button"
                onClick={onEnterEdit}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
              >
                <Pencil size={16} />
                <span className="hidden sm:inline">Edit Table</span>
              </button>
            )}
            {showEditButton && isEditing && (
              <>
                <button
                  type="button"
                  onClick={onCancelEdits}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                >
                  <X size={16} />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={onSaveEdits}
                  disabled={isSavingEdits}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-success px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                >
                  <Check size={16} />
                  <span className="hidden sm:inline">{isSavingEdits ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
