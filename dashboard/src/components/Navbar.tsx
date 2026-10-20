'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard' || pathname === '/';

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--background)]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-14">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
            C
          </div>
          <span className="font-semibold text-sm tracking-tight group-hover:text-[var(--accent-light)] transition-colors">
            Claude Cost Tracker
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              isDashboard
                ? 'text-white bg-white/[0.08]'
                : 'text-[var(--muted)] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
