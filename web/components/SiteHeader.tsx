"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass, Trophy, Wallet, LogIn, UserCircle2, LayoutDashboard, Settings, LogOut } from "lucide-react";
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

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_rgba(124,255,124,0.7)]" />
          <span>mtrly</span>
          <span className="hidden font-mono text-[10px] uppercase text-muted sm:inline">arc testnet</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/explore" icon={<Compass size={14} />}>Explore</NavLink>
          <NavLink href="/leaderboard" icon={<Trophy size={14} />}>Leaderboard</NavLink>
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
    </header>
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
