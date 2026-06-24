"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Orbit, Menu, X } from "lucide-react"

const NAV_LINKS = [
  { label: "Globe",        href: "#globe"        },
  { label: "Radar",        href: "#radar"        },
  { label: "Solar System", href: "#solar-system" },
  { label: "APOD",         href: "#apod"         },
  { label: "About",        href: "#about"        },
] as const

type NavHref = typeof NAV_LINKS[number]["href"]

/**
 * Tracks which section is currently in view using IntersectionObserver.
 * The section whose top edge is closest to (but below) the navbar is
 * considered "active". Observing with a top margin of -72px means a
 * section becomes active as soon as it crosses the bottom of the navbar.
 */
function useActiveSection(): NavHref | null {
  const [active, setActive] = useState<NavHref | null>(null)

  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.slice(1)) // strip the #
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    // rootMargin: shrink the observation area so a section is "active" only
    // once its top edge has scrolled past the navbar height (~72px).
    // The bottom margin is generous so short sections still register.
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost section that is currently intersecting.
        // This handles fast scrolling and sections shorter than the viewport.
        let topmost: { id: string; top: number } | null = null

        for (const entry of entries) {
          if (entry.isIntersecting) {
            const rect = entry.boundingClientRect
            if (topmost === null || rect.top < topmost.top) {
              topmost = { id: entry.target.id, top: rect.top }
            }
          }
        }

        if (topmost) {
          setActive(`#${topmost.id}` as NavHref)
        }
      },
      {
        // Top margin of -72px pushes the detection line below the navbar.
        // Bottom threshold is 0 so partially visible sections still count.
        rootMargin: "-72px 0px -40% 0px",
        threshold: 0,
      }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return active
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const activeSection = useActiveSection()

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMenuOpen(false)
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-[60] flex h-[64px] items-center sm:h-[72px]"
      >
        <div className="glass-panel absolute inset-0 border-x-0 border-t-0" />

        <nav className="relative mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          {/* Logo */}
          <a
            href="#top"
            onClick={(e) => handleNav(e, "#top")}
            className="flex shrink-0 items-center gap-2 sm:gap-2.5"
            aria-label="Project Zenith home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e676] to-[#00c853]">
              <Orbit className="h-4 w-4 text-white" />
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.18em] text-white sm:text-xs sm:tracking-[0.22em]">
              PROJECT ZENITH
            </span>
          </a>

          {/* Center nav links — desktop only */}
          <ul className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href
              return (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNav(e, link.href)}
                    className="group relative flex flex-col items-center gap-0 text-sm font-medium transition-colors"
                    aria-current={isActive ? "true" : undefined}
                  >
                    {/* Label */}
                    <span
                      className={
                        isActive
                          ? "text-white"
                          : "text-[#a0b8a8] group-hover:text-white transition-colors"
                      }
                    >
                      {link.label}
                    </span>

                    {/* Active underline — slides in from centre */}
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-[#00e676]"
                      initial={false}
                      animate={{ opacity: isActive ? 1 : 0, scaleX: isActive ? 1 : 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      style={{ originX: "50%" }}
                      aria-hidden="true"
                    />
                  </a>
                </li>
              )
            })}
          </ul>

          {/* Right: CTA + Hamburger */}
          <div className="flex shrink-0 items-center gap-3">
            <a
              href="/zenith"
              className="btn-zenith-primary rounded-full px-4 py-2 text-xs font-semibold text-white sm:px-5 sm:text-sm"
            >
              Launch Zenith
            </a>
            {/* Hamburger — visible on tablet and below */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#a0b8a8] transition-colors hover:bg-white/5 hover:text-white lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile drawer menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[64px] z-[59] glass-panel border-x-0 border-t-0 sm:top-[72px] lg:hidden"
          >
            <nav className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = activeSection === link.href
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        onClick={(e) => handleNav(e, link.href)}
                        className={[
                          "flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm font-medium transition-colors",
                          isActive
                            ? "text-white bg-white/5"
                            : "text-[#a0b8a8] hover:bg-white/5 hover:text-white",
                        ].join(" ")}
                        aria-current={isActive ? "true" : undefined}
                      >
                        {/* Active dot indicator in mobile menu */}
                        <span
                          className={[
                            "h-1.5 w-1.5 shrink-0 rounded-full transition-all",
                            isActive ? "bg-[#00e676] shadow-[0_0_6px_2px_rgba(0,230,118,0.5)]" : "bg-transparent",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                        {link.label}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
