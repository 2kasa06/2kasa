import { Link } from 'react-router-dom'
import { ages, brand, services } from '../data/content'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ backgroundColor: 'var(--ivory)', borderTop: '1px solid var(--greige)' }}>
      <div className="container py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 mb-5">
              <img src="/images/logo-mark.svg" alt="" width="44" height="44" className="w-11 h-11" />
              <span className="leading-tight">
                <span
                  className="block text-lg tracking-[0.26em]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--warm-brown)' }}
                >
                  BEAUTY
                </span>
                <span
                  className="block text-[0.65rem] tracking-[0.34em]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--rose-beige)' }}
                >
                  PRODUCE
                </span>
              </span>
            </div>
            <p className="text-sm leading-loose" style={{ color: 'var(--medium-brown)' }}>
              {brand.lead}
            </p>
          </div>

          <div className="lg:col-span-3">
            <p className="section-label mb-5">SERVICE</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {services.map((service) => (
                <li key={service.id}>
                  <Link
                    to={`/#services`}
                    className="text-sm transition-colors duration-300 hover:text-[var(--rose-beige)]"
                    style={{ color: 'var(--medium-brown)' }}
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="section-label mb-5">BY AGE</p>
            <ul className="flex flex-col gap-2.5">
              {ages.map((age) => (
                <li key={age.slug}>
                  <Link
                    to={age.path}
                    className="text-sm transition-colors duration-300 hover:text-[var(--rose-beige)]"
                    style={{ color: 'var(--medium-brown)' }}
                  >
                    {age.range}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className="section-label mb-5">CONTACT</p>
            <ul className="flex flex-col gap-2.5 text-sm" style={{ color: 'var(--medium-brown)' }}>
              <li>
                <a href={`tel:${brand.tel.replace(/-/g, '')}`} className="hover:text-[var(--rose-beige)]">
                  {brand.tel}
                </a>
              </li>
              <li>
                <a href={`mailto:${brand.email}`} className="hover:text-[var(--rose-beige)]">
                  {brand.email}
                </a>
              </li>
              <li>{brand.address}</li>
              <li>{brand.hours}</li>
              <li>
                <a
                  href={brand.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 hover:text-[var(--rose-beige)]"
                >
                  <span
                    className="inline-flex w-8 h-8 rounded-full border items-center justify-center text-[0.65rem] tracking-widest"
                    style={{ borderColor: 'var(--greige)' }}
                  >
                    IG
                  </span>
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-14 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--greige)' }}
        >
          <p
            className="text-[0.7rem] tracking-[0.18em]"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--light-brown)' }}
          >
            © {year} {brand.name}. All rights reserved.
          </p>
          <p className="text-[0.7rem] tracking-[0.12em]" style={{ color: 'var(--light-brown)' }}>
            {brand.tagline}
          </p>
        </div>
      </div>
    </footer>
  )
}
