"use client";

import { useState, useCallback, useEffect, useId, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useTheme } from "@/hooks/use-theme";
import { Footer } from "@/components/footer";
import { DaiegoLogo } from "@/components/daiego-logo";
import { PermissionsProvider, usePermissions } from "./permissions-provider";
import { HomePixelBlastBackground } from "@/components/home-pixel-blast-background";
import { HomeShellBackLink } from "@/components/home-shell-back-link";
import { usesTableScrollShell } from "@/lib/table-scroll-shell";

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

/**
 * Initials from full name: "Diego Murillo" → "DM"
 * @param {string | null | undefined} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";

  // Prefer name part before email domain if the display value is an email
  const base = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const parts = base.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toUpperCase();
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
  { href: "/payments", label: "Pagos", resource: "payments" },
  { href: "/clients", label: "Clientes", resource: "clients" },
  { href: "/services", label: "Servicios", resource: "services" },
  { href: "/categories", label: "Categorías", resource: "categories" },
  { href: "/payment-methods", label: "Métodos de pago", resource: "payment_methods" },
  { href: "/users", label: "Usuarios", resource: "users" },
  { href: "/roles", label: "Roles", resource: "roles" },
];

const SIDEBAR_PATH_PREFIXES = NAV_ITEMS.map((item) => item.href);

function usesHomeShell(pathname) {
  if (pathname === "/") return true;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  if (SIDEBAR_PATH_PREFIXES.includes(`/${segments[0]}`)) return false;
  // Home-style shell for /[serviceId] search and /[serviceId]/[billId] register/edit
  return segments.length === 1 || segments.length === 2;
}

function NavContent({ pathname, onNavClick, hideLogo, hideThemeToggle }) {
  const { can, isLoading } = usePermissions();
  const visibleItems = isLoading
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => can(item.resource, "view"));
  return (
    <>
      {!hideLogo && (
        <div className="flex h-16 items-center border-b border-zinc-200/80 px-5 dark:border-zinc-800">
          <Link
            href="/"
            onClick={onNavClick}
            className="flex min-w-0 items-center gap-3 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-50 dark:focus:ring-offset-zinc-900"
            aria-label="Ir a inicio — DAIEGO Receipts"
          >
            <DaiegoLogo
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 object-contain"
            />
            <span className="truncate text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Receipts
            </span>
          </Link>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1 p-3" role="navigation">
        {visibleItems.map((item) => {
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
                  ? "bg-emerald-100 text-emerald-800 shadow-[inset_3px_0_0_0_#10b981] dark:bg-emerald-950/50 dark:text-emerald-300 dark:shadow-[inset_3px_0_0_0_#34d399]"
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

function HomeUserMenu() {
  const user = useUser();
  const router = useRouter();
  const menuId = useId();
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const name = displayName(user);
  const initials = getInitials(name);

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSignOut = useCallback(async () => {
    setIsOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus:ring-offset-zinc-950"
        aria-label={name ? `Menú de usuario: ${name}` : "Menú de usuario"}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <span aria-hidden>{initials}</span>
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Opciones de usuario"
          className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200/80 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <Link
            href="/payments"
            role="menuitem"
            tabIndex={0}
            onClick={handleClose}
            className="block px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:bg-zinc-800"
          >
            Administración
          </Link>
          <button
            type="button"
            role="menuitem"
            tabIndex={0}
            onClick={handleSignOut}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "mobile";
  const isTablet = breakpoint === "tablet";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHome = usesHomeShell(pathname);
  const isHomeServices = pathname === "/";

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const isTableScrollPage = usesTableScrollShell(pathname);

  if (isHome) {
    return (
      <PermissionsProvider>
        <div className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
          <HomePixelBlastBackground />
          <div className="absolute left-6 top-6 z-20 flex items-center gap-2">
            <MobileThemeToggle />
            <Suspense fallback={null}>
              <HomeShellBackLink />
            </Suspense>
          </div>
          <div className="absolute right-6 top-6 z-20">
            <HomeUserMenu />
          </div>
          <main
            className={`relative z-10 flex min-h-0 flex-1 flex-col ${isHomeServices ? "overflow-hidden" : "overflow-y-auto"}`}
          >
            <div
              className={`flex w-full flex-1 flex-col px-4 py-4 tablet:px-6 desktop:px-8 ${isHomeServices ? "min-h-0 overflow-hidden" : ""}`}
            >
              {children}
            </div>
            <div className="shrink-0">
              <Footer />
            </div>
          </main>
        </div>
      </PermissionsProvider>
    );
  }

  return (
    <PermissionsProvider>
    <div className="fixed inset-0 flex overflow-hidden bg-zinc-50 dark:bg-zinc-950">
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
              href="/"
              onClick={closeMobileMenu}
              className="flex min-w-0 items-center gap-2 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-50 dark:focus:ring-offset-zinc-900"
              aria-label="Ir a inicio — DAIEGO Receipts"
            >
              <DaiegoLogo
                width={40}
                height={40}
                className="h-9 w-9 shrink-0 object-contain"
              />
              <span className="truncate text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                Receipts
              </span>
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
          hideThemeToggle={isMobile}
        />
      </aside>

      {/* Main content: payments page scrolls only inside the table; other pages scroll here. */}
      <main
        className={`flex min-h-0 flex-1 flex-col tablet:min-w-0 ${isTableScrollPage ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        <div
          className={`w-full flex-1 p-4 tablet:p-6 desktop:p-8 ${isTableScrollPage ? "flex min-h-0 flex-col overflow-hidden" : ""} ${isMobile ? "pt-20" : ""} ${isTablet ? "pt-10" : ""}`}
        >
          {children}
        </div>
        <div className="shrink-0">
          <Footer />
        </div>
      </main>
    </div>
    </PermissionsProvider>
  );
}
