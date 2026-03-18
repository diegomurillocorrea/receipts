"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useTheme } from "@/hooks/use-theme";

function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  return user;
}

function displayName(user) {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return meta.full_name ?? meta.name ?? user.email ?? "Usuario";
}

function UserDisplay() {
  const user = useUser();
  const name = displayName(user);
  if (!name) return null;
  return (
    <div
      className="rounded-xl px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400"
      aria-label={`Conectado como ${name}`}
    >
      <span className="truncate block">{name}</span>
    </div>
  );
}

const NAV_ITEMS = [
  { href: "/payments", label: "Pagos" },
  { href: "/clients", label: "Clientes" },
  { href: "/services", label: "Servicios" },
  { href: "/payment-methods", label: "Métodos de pago" },
];

function NavContent({ pathname, onNavClick, hideLogo, hideThemeToggle }) {
  return (
    <>
      {!hideLogo && (
        <div className="flex h-16 items-center border-b border-zinc-200/80 px-5 dark:border-zinc-800">
          <Link
            href="/payments"
            onClick={onNavClick}
            className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Gestor de Recibos
          </Link>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1 p-3" role="navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200/80 p-3 dark:border-zinc-800">
        <div className="flex flex-col gap-2">
          <UserDisplay />
          {!hideThemeToggle && <ThemeToggle />}
          <SignOutButton />
        </div>
      </div>
    </>
  );
}

function MobileThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
      aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      {theme === "light" ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
      aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      <span className="flex items-center gap-2">
        {theme === "light" ? (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Modo oscuro
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Modo claro
          </>
        )}
      </span>
    </button>
  );
}

function SignOutButton() {
  const router = useRouter();
  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }, [router]);
  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
      aria-label="Cerrar sesión"
    >
      Cerrar sesión
    </button>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const isTablet = breakpoint === "tablet";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="fixed inset-0 flex items-start overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile: top bar with menu button */}
      {isMobile && (
        <header
          className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/95 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95"
          aria-label="App bar"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <Link
              href="/payments"
              onClick={closeMobileMenu}
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Gestor de Recibos
            </Link>
          </div>
          <MobileThemeToggle />
        </header>
      )}

      {/* Mobile: overlay when menu open */}
      {isMobile && mobileMenuOpen && (
        <button
          type="button"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
          aria-label="Cerrar menú"
        />
      )}

      {/* Sidebar: drawer on mobile (slide-in), sidebar on tablet/desktop */}
      <aside
        className={`
          flex h-full w-64 flex-col border-r border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none
          tablet:relative tablet:flex tablet:shadow-lg
          ${isMobile ? "fixed inset-y-0 left-0 z-50 flex transform transition-transform duration-300 ease-out" : ""}
          ${isMobile && !mobileMenuOpen ? "-translate-x-full" : ""}
          ${isMobile && mobileMenuOpen ? "translate-x-0 shadow-xl" : ""}
        `}
        aria-label="Dashboard navigation"
      >
        {isMobile && (
          <div className="flex h-14 items-center justify-between border-b border-zinc-200/80 px-4 dark:border-zinc-800">
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Menú
            </span>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label="Cerrar menú"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <NavContent
          pathname={pathname}
          onNavClick={isMobile ? closeMobileMenu : undefined}
          hideLogo={isMobile}
          hideThemeToggle={isMobile || isTablet}
        />
      </aside>

      {/* Main content: only this area scrolls; sidebar stays fixed */}
      <main className="min-h-0 max-h-screen flex-1 flex-col overflow-y-auto tablet:min-w-0">
        <div
          className={`w-full p-4 tablet:p-6 desktop:p-8 ${isMobile ? "pt-20" : ""} ${isTablet ? "pt-10" : ""}`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
