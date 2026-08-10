import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export default function Pagination({ totalCount, page, pageSize, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const handlePageSizeChange = (event) => {
    onPageSizeChange(Number(event.target.value))
    onPageChange(1)
  }

  return (
    <div className="mt-6 flex flex-row items-center justify-between gap-2 sm:gap-4">
      <div className="relative shrink-0">
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          className="appearance-none rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-7 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:py-2 sm:pl-4 sm:pr-9 sm:text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 sm:right-3"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-500 sm:h-8 sm:w-8"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-xs font-semibold text-white sm:h-8 sm:w-8 sm:text-sm"
        >
          {page}
        </button>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-gray-500 sm:h-8 sm:w-8"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <span className="shrink-0 text-xs text-gray-500 sm:text-sm">{totalCount} total</span>
    </div>
  )
}
