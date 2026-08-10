import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, ShoppingBag } from 'lucide-react'
import ImagePlaceholder from '../../components/ImagePlaceholder.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import PinOverlay from '../../components/PinOverlay.jsx'
import FilterMenu from '../../components/FilterMenu.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import { isDeviceRecognized, verifyPin } from '../../lib/auth.js'
import { listShoes } from '../../lib/shoesApi.js'

export default function Collection() {
  const { tag } = useParams()
  const navigate = useNavigate()
  const [isPinOpen, setIsPinOpen] = useState(false)
  const [isCheckingDevice, setIsCheckingDevice] = useState(false)
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [shoes, setShoes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    listShoes()
      .then((data) => {
        if (!cancelled) setShoes(data)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the collection right now.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visibleShoes = useMemo(() => {
    const filtered = shoes.filter((shoe) => shoe.name.toLowerCase().includes(search.trim().toLowerCase()))
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'az') return a.name.localeCompare(b.name)
      if (sort === 'za') return b.name.localeCompare(a.name)
      return new Date(b.created_at) - new Date(a.created_at)
    })
    return sorted
  }, [shoes, search, sort])

  const handlePinSuccess = () => {
    setIsPinOpen(false)
    navigate(`/collection/${tag}/manage`)
  }

  const handleManageClick = async () => {
    setIsCheckingDevice(true)
    const ok = await isDeviceRecognized()
    setIsCheckingDevice(false)
    if (!ok) {
      navigate('/403')
      return
    }
    setIsPinOpen(true)
  }

  return (
    <>
      <section className="bg-black py-10 text-center">
        <h1 className="font-serif-display text-3xl font-bold uppercase tracking-[0.15em] text-white sm:text-4xl">
          {tag}
        </h1>
      </section>

      <section className="bg-accent px-6 py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 md:grid-cols-3">
          <div className="md:justify-self-start">
            <FilterMenu label="Filter Shoes" value={sort} onChange={setSort} />
          </div>

          <div className="flex items-center gap-2 border-b border-gray-400 px-1 py-1 md:mx-auto md:w-80">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Shoe Name"
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleManageClick}
            disabled={isCheckingDevice}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 md:justify-self-end"
          >
            <ShoppingBag size={16} />
            Manage Collections
          </button>
        </div>

        <div className="mx-auto mt-8 max-w-7xl">
          {isLoading ? (
            <LoadingSpinner label="Loading Collection..." />
          ) : loadError ? (
            <p className="text-center text-danger">{loadError}</p>
          ) : visibleShoes.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No shoes yet"
              message={`No shoes have been added to the ${tag} collection yet.`}
            />
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {visibleShoes.map((shoe) => (
                <Link
                  key={shoe.id}
                  to={`/collection/${tag}/shoe/${shoe.id}`}
                  className="flex flex-col items-center text-center"
                >
                  {shoe.images?.[0] ? (
                    <img
                      src={shoe.images[0].image_url}
                      alt={shoe.name}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ) : (
                    <ImagePlaceholder className="aspect-square w-full rounded-lg" />
                  )}
                  <h3 className="mt-4 font-bold text-black">{shoe.name}</h3>
                  <p className="mt-1 text-gray-600">₱{shoe.price}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <PinOverlay
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        onSubmit={verifyPin}
        onSuccess={handlePinSuccess}
      />
    </>
  )
}
