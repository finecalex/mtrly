import { NextRequest, NextResponse } from "next/server";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import { writeFile } from "node:fs/promises";

export async function POST(req: NextRequest) {
  const setupKey = process.env.ADMIN_SETUP_KEY;
  if (!setupKey) return NextResponse.json({ error: "ADMIN_SETUP_KEY not set" }, { status: 500 });

  const provided = req.headers.get("x-admin-setup-key");
  if (provided !== setupKey) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) {
    return NextResponse.json({ error: "circle env missing" }, { status: 500 });
  }

  try {
    const res = await registerEntitySecretCiphertext({ apiKey, entitySecret });
    const recovery = (res as any)?.data?.recoveryFile;
    if (recovery) {
      const path = "/app/recovery-entity-secret.dat";
      await writeFile(path, recovery).catch(() => null);
    }
    return NextResponse.json({ ok: true, note: "Entity Secret registered. Recovery file (if any) saved to /app/recovery-entity-secret.dat, grab it and back up." });
  } catch (e: any) {
    const msg: string = e?.response?.data?.message ?? e?.message ?? String(e);
    if (msg.toLowerCase().includes("already")) {
      return NextResponse.json({ ok: true, note: "Already registered." });
    }
    return NextResponse.json({ error: "registration_failed", detail: msg }, { status: 500 });
  }
}
