import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "mtrly_session";
const ALG = "HS256";

function secret() {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 16) throw new Error("JWT_SECRET not set or too short");
  return new TextEncoder().encode(raw);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function issueToken(userId: number): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function readToken(token: string): Promise<{ uid: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.uid !== "number") return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function currentUserId(): Promise<number | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await readToken(token);
  return payload?.uid ?? null;
}
