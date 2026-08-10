const STATS = [
  { value: '100+', label: 'YEARS OF HERITAGE' },
  { value: '3', label: 'GENERATIONS OF CRAFT' },
  { value: 'MNL', label: 'HEART OF SHOEMAKING' },
]

export default function AboutUs() {
  return (
    <>
      <section className="bg-primary px-6 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm tracking-widest text-white/70">
            Est. Early 1900s &nbsp;·&nbsp; Marikina City
          </p>
          <h1 className="mt-6 font-serif-display text-4xl font-bold leading-tight sm:text-5xl">
            Three Generations.
            <br />
            One Pair at a Time.
          </h1>
          <p className="mt-6 text-white/80">
            Handcrafted women&apos;s footwear rooted in tradition, quality, and family pride.
          </p>
        </div>
      </section>

      <section className="bg-accent px-6 py-12">
        <div className="mx-auto flex max-w-3xl items-center justify-center divide-x divide-primary/20 text-center">
          {STATS.map((stat) => (
            <div key={stat.label} className="min-w-0 flex-1 px-3 sm:px-6">
              <p className="break-words font-serif-display text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 break-words text-xs tracking-wide text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-bold tracking-widest text-primary">OUR STORY</p>
          <h2 className="mt-3 font-serif-display text-3xl font-bold leading-tight text-black sm:text-4xl">
            Where Every Pair
            <br />
            Begins With a Promise
          </h2>
          <p className="mt-6 leading-relaxed text-gray-600">
            Since the early 1900s, Theresa Shoes has been crafting footwear by hand in the heart
            of Marikina City — the Philippines&apos; shoemaking capital. What started as a small
            family workshop has endured through generations, each one carrying forward the same
            dedication to quality leather, careful stitching, and honest craftsmanship.
          </p>
          <p className="mt-4 leading-relaxed text-gray-600">
            Across three generations, the tools have evolved but the values never have. Every
            pair that leaves our hands is made to be relied on — footwear you&apos;ll feel
            confident wearing every step of the way.
          </p>
        </div>
      </section>
    </>
  )
}
