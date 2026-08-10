import { useEffect, useState } from 'react'

/** Shared page/pageSize state for admin list pages. Clamps automatically when a filter
 * shrinks the result set below the current page, instead of showing an empty page. */
export function usePagination(itemCount, defaultPageSize = 20) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize))

  // Persist the clamp into state itself — otherwise `page` stays stuck at its old value
  // underneath the clamped display, and clearing the filter later silently jumps back to it.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

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
