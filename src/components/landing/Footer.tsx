"use client"

import { Orbit, Globe, Send, Rss } from "lucide-react"

const COLUMNS = [
  { title: "Platform",  links: ["Globe", "Radar", "Solar System", "APOD"] },
  { title: "Company",   links: ["About", "Careers", "Press", "Contact"]   },
  { title: "Resources", links: ["Docs", "API", "Status", "Changelog"]     },
]

const NAV_ANCHORS = [
  { label: "Globe",        href: "#globe"        },
  { label: "Radar",        href: "#radar"        },
  { label: "Solar System", href: "#solar-system" },
  { label: "APOD",         href: "#apod"         },
]

export default function Footer() {
  return (
    <footer
      className="relative z-10 px-4 pb-10 pt-16 text-white sm:px-6 lg:px-10 sm:pb-12 sm:pt-20"
      style={{ background: "linear-gradient(to bottom, #01080a 0%, #000000 30%)" }}
    >
      <div className="mx-auto max-w-[1440px]">

        <div className="grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e676] to-[#00c853]">
                <Orbit className="h-4 w-4 text-white" />
              </span>
              <span className="text-xs font-extrabold tracking-[0.22em]">PROJECT ZENITH</span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#6a8870]">
              Real-time orbital intelligence for a connected planet.
            </p>
            <div className="mt-6 flex gap-3">
              {[Globe, Send, Rss].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-[#a0b8a8] transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="sr-only">Social link</span>
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60">{col.title}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-[#6a8870] transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 text-xs text-[#3a5040] sm:flex-row sm:mt-14">
          <p>© {new Date().getFullYear()} Project Zenith. All rights reserved.</p>
          <nav className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {NAV_ANCHORS.map((l) => (
              <a key={l.label} href={l.href} className="transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
