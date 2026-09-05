import { useState } from 'react'

/** Shared page/pageSize state for the admin list pages that still filter client-side.
 * Callers reset to page 1 when a filter or search changes; the clamp below covers the
 * remaining case where the result set shrinks under the current page. */
export function usePagination(itemCount, defaultPageSize = 20) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize))

  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize

  return {
    page: safePage,
    pageSize,
    setPage,
    setPageSize,
    slice: (items) => items.slice(start, start + pageSize),
  }
}
