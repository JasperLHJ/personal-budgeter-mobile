import { Link, useLocation } from "react-router";
import type { ReactNode } from "react";

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const tabs = [
  { href: "/", label: "Dashboard", icon: icon(<path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />) },
  { href: "/spending", label: "Spending", icon: icon(<path d="M4 7h16M4 12h16M4 17h10" />) },
  {
    href: "/settings",
    label: "Settings",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" />
      </>,
    ),
  },
];

export function TabBar() {
  const pathname = useLocation().pathname;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mx-auto md:w-full md:max-w-2xl md:border-0 md:bg-transparent md:pt-3 md:pb-0 md:backdrop-blur-none">
      {tabs.map((t) => (
        <Link
          key={t.href}
          to={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className="group flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted transition-colors aria-[current=page]:font-semibold aria-[current=page]:text-accent md:flex-row md:gap-2 md:text-sm"
        >
          <span className="rounded-full px-4 py-1 transition-colors group-aria-[current=page]:bg-accent-soft md:px-0 md:py-0 md:group-aria-[current=page]:bg-transparent">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
