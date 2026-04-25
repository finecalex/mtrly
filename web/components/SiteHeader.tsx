"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass, Trophy, Wallet, LogIn, UserCircle2, LayoutDashboard, Settings, LogOut, Menu, X, BookOpen } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

type Me = {
  id: number;
  email: string;
  displayName: string | null;
  role: "viewer" | "creator";
  walletAddress: string | null;
  balance: string;
  slug?: string | null;
  avatarUrl?: string | null;
};

export function SiteHeader() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setMe(data.user ?? null);
      })
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, []);

  // close mobile drawer on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-fg md:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_rgba(124,255,124,0.7)]" />
          <span>mtrly</span>
          <span className="hidden font-mono text-[10px] uppercase text-muted sm:inline">arc testnet</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          <NavLink href="/explore" icon={<Compass size={14} />}>Explore</NavLink>
          <NavLink href="/leaderboard" icon={<Trophy size={14} />}>Leaderboard</NavLink>
          <NavLink href="/how-it-works" icon={<BookOpen size={14} />}>How it works</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {me === undefined ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-surface" />
          ) : me === null ? (
            <>
              <Link
                href="/auth/login"
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-fg"
              >
                <span className="hidden sm:inline">Log in</span>
                <LogIn size={16} className="sm:hidden" />
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1 hover:border-fg"
              >
                <Avatar
                  size={26}
                  name={me.displayName}
                  email={me.email}
                  seed={me.slug ?? me.email}
                  src={me.avatarUrl ?? undefined}
                />
                <span className="hidden font-mono text-xs tabular-nums text-fg sm:inline">
                  ${Number(me.balance).toFixed(4)}
                </span>
              </button>
              {open && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
                    <div className="border-b border-border p-3">
                      <div className="text-sm font-medium">{me.displayName ?? me.email}</div>
                      <div className="font-mono text-[10px] uppercase text-muted">{me.role}</div>
                    </div>
                    <DropItem href="/balance" icon={<Wallet size={14} />}>Balance</DropItem>
                    {me.role === "creator" && (
                      <DropItem href="/dashboard" icon={<LayoutDashboard size={14} />}>Creator dashboard</DropItem>
                    )}
                    {me.slug && (
                      <DropItem href={`/c/${me.slug}`} icon={<UserCircle2 size={14} />}>My public page</DropItem>
                    )}
                    <DropItem href="/settings" icon={<Settings size={14} />}>Settings</DropItem>
                    <form action="/api/auth/logout" method="POST" className="border-t border-border">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg"
                      >
                        <LogOut size={14} /> Log out
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[80vw] overflow-y-auto border-r border-border bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 font-semibold">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
                <span>mtrly</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-fg"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-1">
              <MobileNavLink href="/explore" icon={<Compass size={16} />} onClick={() => setMobileOpen(false)}>Explore</MobileNavLink>
              <MobileNavLink href="/leaderboard" icon={<Trophy size={16} />} onClick={() => setMobileOpen(false)}>Leaderboard</MobileNavLink>
              <MobileNavLink href="/how-it-works" icon={<BookOpen size={16} />} onClick={() => setMobileOpen(false)}>How it works</MobileNavLink>
            </nav>
            {me && (
              <>
                <div className="my-4 border-t border-border" />
                <div className="flex items-center gap-3 rounded-lg border border-border bg-bg/50 p-3">
                  <Avatar
                    size={36}
                    name={me.displayName}
                    email={me.email}
                    seed={me.slug ?? me.email}
                    src={me.avatarUrl ?? undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{me.displayName ?? me.email}</div>
                    <div className="font-mono text-[10px] uppercase text-muted">${Number(me.balance).toFixed(4)} balance</div>
                  </div>
                </div>
                <nav className="mt-2 flex flex-col gap-1">
                  <MobileNavLink href="/balance" icon={<Wallet size={16} />} onClick={() => setMobileOpen(false)}>Balance</MobileNavLink>
                  {me.role === "creator" && (
                    <MobileNavLink href="/dashboard" icon={<LayoutDashboard size={16} />} onClick={() => setMobileOpen(false)}>Creator dashboard</MobileNavLink>
                  )}
                  {me.slug && (
                    <MobileNavLink href={`/c/${me.slug}`} icon={<UserCircle2 size={16} />} onClick={() => setMobileOpen(false)}>My public page</MobileNavLink>
                  )}
                  <MobileNavLink href="/settings" icon={<Settings size={16} />} onClick={() => setMobileOpen(false)}>Settings</MobileNavLink>
                  <form action="/api/auth/logout" method="POST" className="mt-2">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-bg"
                    >
                      <LogOut size={16} /> Log out
                    </button>
                  </form>
                </nav>
              </>
            )}
            {!me && (
              <>
                <div className="my-4 border-t border-border" />
                <div className="flex flex-col gap-2">
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-bg"
                  >
                    Sign up
                  </Link>
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-border px-4 py-2 text-center text-sm"
                  >
                    Log in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MobileNavLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg hover:bg-bg"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-muted transition-colors",
        "hover:bg-surface hover:text-fg",
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function DropItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-bg">
      {icon}
      <span>{children}</span>
    </Link>
  );
}
