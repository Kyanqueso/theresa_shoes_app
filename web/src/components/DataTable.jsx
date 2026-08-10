import EmptyState from './EmptyState.jsx'

export default function DataTable({ columns, rows, emptyIcon, emptyTitle, emptyMessage, rowClassName }) {
  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className="w-full overflow-x-auto border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-primary text-white">
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id ?? index}
              className={`border-t border-gray-200 ${rowClassName?.(row) || 'bg-white'}`}
            >
              {columns.map((column) => (
                <td key={column.key} className="break-words px-4 py-3 text-gray-700">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
