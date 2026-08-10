import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import { listShoes } from '../../lib/shoesApi.js'
import carousel1 from '../../assets/images/carousel-1.png'
import carousel2 from '../../assets/images/carousel-2.png'
import carousel3 from '../../assets/images/carousel-3.png'

const AUTO_ROTATE_MS = 6000

const SLIDES = [
  {
    key: 'new-now-yours',
    image: carousel1,
    align: 'justify-end text-right',
    content: (
      <div className="max-w-md">
        <h1 className="font-serif-display text-5xl font-bold uppercase leading-tight text-black sm:text-6xl">
          <span className="text-golden-brown">New.</span>
          <br />
          <span className="text-golden-brown">Now.</span>
          <br />
          Yours.
        </h1>
        <Link
          to="/collection"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          View Shoe Collection
        </Link>
      </div>
    ),
  },
  {
    key: 'made-to-order',
    image: carousel3,
    align: 'justify-center text-center',
    content: (
      <div className="max-w-md rounded-xl bg-accent px-8 py-8 shadow-lg">
        <h1 className="font-serif-display text-4xl font-bold uppercase text-golden-brown sm:text-5xl">
          Made to Order
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm text-gray-600">
          Custom-made quality shoes for professionals, perfect for day-to-day usage
        </p>
        <Link
          to="/contact"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          How to Order
        </Link>
      </div>
    ),
  },
  {
    key: 'rich-selection',
    image: carousel2,
    align: 'justify-start text-left',
    content: (
      <div className="max-w-md rounded-xl bg-accent px-6 py-6 shadow-lg lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
        <h1 className="font-serif-display text-4xl font-bold uppercase text-golden-brown sm:text-5xl">
          Rich Selection
        </h1>
        <p className="mt-3 max-w-sm text-sm text-black">
          Spruce up your everyday office look with our wide range of stylish, refined formal shoes.
        </p>
        <Link
          to="/collection"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Browse All Styles
        </Link>
      </div>
    ),
  },
]

function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((current) => (current + 1) % SLIDES.length)
    }, AUTO_ROTATE_MS)
    return () => clearInterval(interval)
  }, [])

  const goToPrev = () => setActiveSlide((current) => (current - 1 + SLIDES.length) % SLIDES.length)
  const goToNext = () => setActiveSlide((current) => (current + 1) % SLIDES.length)

  const slide = SLIDES[activeSlide]

  return (
    <section className="relative flex h-[480px] overflow-hidden sm:h-[560px]">
      <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover" />

      <div className={`relative mx-auto flex w-full max-w-7xl flex-1 items-center px-16 sm:px-20 ${slide.align}`}>
        {slide.content}
      </div>

      <button
        type="button"
        onClick={goToPrev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={goToNext}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
      >
        <ChevronRight size={22} />
      </button>

      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2">
        {SLIDES.map((item, index) => (
          <button
            key={item.key}
            type="button"
            aria-label={`Show slide ${index + 1}`}
            onClick={() => setActiveSlide(index)}
            className={`h-1.5 w-6 rounded-sm transition-colors ${
              activeSlide === index ? 'bg-golden-brown' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </section>
  )
}

function FeaturedShoesSection({ shoes, isLoading }) {
  if (isLoading) {
    return (
      <section className="bg-accent px-6 py-16">
        <LoadingSpinner label="Loading Collection..." />
      </section>
    )
  }

  if (shoes.length === 0) {
    return (
      <section className="bg-accent px-6 py-20 text-center">
        <h2 className="font-serif-display text-3xl font-bold uppercase text-black sm:text-4xl">
          No Collections Available
        </h2>
        <p className="mt-2 text-sm text-gray-600">Please return after a few days.</p>
        <Link
          to="/contact"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Contact Us
        </Link>
      </section>
    )
  }

  const [main, ...rest] = shoes
  const [img1, img2] = rest.slice(0, 2)

  const imageCell = (shoe, aspectClass = 'aspect-square') => (
    <Link key={shoe.id} to="/collection">
      <img
        src={shoe.images[0].image_url}
        alt={shoe.name}
        className={`w-full ${aspectClass} rounded-sm object-cover shadow-md`}
      />
    </Link>
  )

  const textBlock = (
    <div className="min-w-0 flex flex-col justify-center">
      <h2 className="break-words font-serif-display text-2xl font-bold uppercase leading-snug text-black sm:text-3xl">
        Stylish.
        <br />
        Comfortable.
        <br />
        Reasonably Priced.
      </h2>
      <p className="mt-3 max-w-sm text-sm text-gray-600">
        Get your perfect pair—just follow our four simple steps to begin your journey to better shoes.
      </p>
      <Link
        to="/contact"
        className="mt-6 inline-block w-fit rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Go to Steps
      </Link>
    </div>
  )

  // Exactly 3 images fills a clean 2x2 grid with the text as the 4th equal-sized cell.
  // Anything else (1 or 2 images) doesn't divide evenly into that grid, so it falls back
  // to just the main image next to the text — the extra second image is left unused here.
  if (img1 && img2) {
    return (
      <section className="bg-accent px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {imageCell(img2)}
            <div className="aspect-square rounded-sm bg-accent p-4">{textBlock}</div>
            {imageCell(main)}
            {imageCell(img1)}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-accent px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-2 gap-4">
          {imageCell(main)}
          <div className="aspect-square rounded-sm bg-accent p-4">{textBlock}</div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const [shoes, setShoes] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listShoes()
      .then((data) => {
        if (!cancelled) setShoes(data)
      })
      .catch(() => {
        if (!cancelled) setShoes([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const featuredShoes = useMemo(() => {
    const sorted = [...shoes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return sorted.filter((shoe) => shoe.images?.[0]).slice(0, 3)
  }, [shoes])

  return (
    <div>
      <HeroCarousel />
      <FeaturedShoesSection shoes={featuredShoes} isLoading={isLoading} />

      <section className="bg-primary px-6 py-16 text-center">
        <h2 className="font-serif-display text-3xl font-bold uppercase text-white sm:text-4xl">Get a Pair Now!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
          Step into elegance with our handcrafted shoes. Quality, comfort, and style in every pair.
        </p>
        <Link
          to="/collection"
          className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Order Now
        </Link>
      </section>
    </div>
  )
}
