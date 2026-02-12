import { env } from "@/lib/env";

export const SESSION_COOKIE_NAME = "ciudades_session";

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface SessionPayload {
  u: string;
  exp: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function getSigningKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payloadBase64: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadBase64));
  return bytesToBase64Url(new Uint8Array(signature));
}

function decodePayload(value: string): SessionPayload | null {
  const bytes = base64UrlToBytes(value);
  if (!bytes) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoder.decode(bytes)) as SessionPayload;
    if (!parsed.u || !parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function sanitizeRedirectPath(rawPath: string | null | undefined): string {
  if (!rawPath || !rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return "/";
  }

  return rawPath;
}

export async function createSessionToken(username: string): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadBase64 = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return false;
  }

  const signatureBytes = base64UrlToBytes(signature);
  if (!signatureBytes) {
    return false;
  }

  const signatureInput = new Uint8Array(signatureBytes.length);
  signatureInput.set(signatureBytes);

  const key = await getSigningKey();
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureInput,
    encoder.encode(payloadBase64),
  );

  if (!isValid) {
    return false;
  }

  const payload = decodePayload(payloadBase64);
  if (!payload) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowSeconds;
}

export async function validateLoginCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  return username === env.AUTH_USER && password === env.AUTH_PASS;
}

export function buildSessionCookie(value: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function buildClearedSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
