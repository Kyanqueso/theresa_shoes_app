/** Shared sort choices for the admin list toolbars and the guest collection filter.
 * Kept out of SortSelect.jsx so that file only exports its component — mixing constant and
 * component exports breaks React Fast Refresh for the whole module.
 * The values match the `sort` parameter the API accepts. */
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'az', label: 'Name: A to Z' },
  { value: 'za', label: 'Name: Z to A' },
]
