"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Save, Check, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

type Profile = {
  id: number;
  email: string;
  displayName: string | null;
  role: "viewer" | "creator";
  slug: string | null;
  avatarUrl: string | null;
  bio: string | null;
  walletAddress: string | null;
  circleWalletAddr: string | null;
  ownedEoaAddress: string | null;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<"viewer" | "creator">("viewer");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setProfile(null);
          return;
        }
        setProfile(data.user);
        setDisplayName(data.user.displayName ?? "");
        setSlug(data.user.slug ?? "");
        setAvatarUrl(data.user.avatarUrl ?? "");
        setBio(data.user.bio ?? "");
        setRole(data.user.role ?? "viewer");
      })
      .catch(() => setProfile(null));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        displayName: displayName.trim() || null,
        slug: slug.trim().toLowerCase(),
        avatarUrl: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        role,
      };
      if (!body.displayName) delete body.displayName;
      if (!body.slug) delete body.slug;
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error ?? "save_failed" });
      } else {
        setMsg({ type: "ok", text: "Saved." });
        setProfile((p) => (p ? { ...p, ...data.user } : p));
      }
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "save_failed" });
    } finally {
      setSaving(false);
    }
  }

  if (profile === undefined) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-muted">Loading…</main>;
  }
  if (profile === null) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-muted">Sign in to manage your profile.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/auth/login" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg">Log in</Link>
          <Link href="/auth/signup" className="rounded-lg border border-border px-4 py-2 text-sm">Sign up</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <div className="font-mono text-xs uppercase text-muted">mtrly / settings</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted">
          Your public page is at <span className="font-mono text-fg">/c/{profile.slug ?? "—"}</span>
          {profile.slug && (
            <Link href={`/c/${profile.slug}`} className="ml-2 text-accent hover:underline">
              view ↗
            </Link>
          )}
        </p>
      </header>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar
                size={64}
                name={displayName}
                email={profile.email}
                seed={slug || profile.email}
                src={avatarUrl || undefined}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{displayName || profile.email}</div>
                <div className="font-mono text-xs text-muted">{profile.email}</div>
              </div>
              <Badge variant="muted">{role}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={64}
              className="mt-1.5"
              placeholder="Your name"
            />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              maxLength={32}
              className="mt-1.5"
              placeholder="your-slug"
            />
            <p className="mt-1 font-mono text-[10px] text-muted">
              mtrly.app/c/<span className="text-fg">{slug || "your-slug"}</span>
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
          <Input
            id="avatarUrl"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="mt-1.5"
            placeholder="https://…"
          />
          <p className="mt-1 font-mono text-[10px] text-muted">
            Leave blank to use a generated gradient with your initials.
          </p>
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 500))}
            className="mt-1.5"
            placeholder="What do you create?"
          />
          <p className="mt-1 text-right font-mono text-[10px] text-muted">{bio.length}/500</p>
        </div>

        <div>
          <Label>Role</Label>
          <div className="mt-1.5 flex gap-2">
            {(["viewer", "creator"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={[
                  "rounded-lg border px-4 py-2 text-sm capitalize transition-colors",
                  role === r ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-fg",
                ].join(" ")}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">
            Creators can register URLs and earn USDC. Viewers consume content.
          </p>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-5">
          <Button type="submit" disabled={saving}>
            <Save size={14} /> {saving ? "Saving…" : "Save changes"}
          </Button>
          {msg?.type === "ok" && (
            <span className="flex items-center gap-1 text-sm text-accent">
              <Check size={14} /> {msg.text}
            </span>
          )}
          {msg?.type === "err" && (
            <span className="flex items-center gap-1 text-sm text-red-400">
              <AlertCircle size={14} /> {msg.text}
            </span>
          )}
        </div>
      </form>

      <section className="mt-12 rounded-xl border border-border bg-surface/50 p-5">
        <h2 className="font-mono text-xs uppercase text-muted">Wallet addresses</h2>
        <div className="mt-3 space-y-2 font-mono text-xs">
          {profile.ownedEoaAddress && (
            <AddressRow label="Tick-signing EOA (Arc)" addr={profile.ownedEoaAddress} />
          )}
          {profile.circleWalletAddr && (
            <AddressRow label="Circle Wallet" addr={profile.circleWalletAddr} />
          )}
        </div>
      </section>
    </main>
  );
}

function AddressRow({ label, addr }: { label: string; addr: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg/50 p-2">
      <div>
        <div className="text-[10px] uppercase text-muted">{label}</div>
        <div className="break-all">{addr}</div>
      </div>
      <a
        href={`https://testnet.arcscan.app/address/${addr}`}
        target="_blank"
        rel="noreferrer"
        className="flex shrink-0 items-center gap-1 text-[10px] uppercase text-muted hover:text-fg"
      >
        arcscan <ExternalLink size={10} />
      </a>
    </div>
  );
}
