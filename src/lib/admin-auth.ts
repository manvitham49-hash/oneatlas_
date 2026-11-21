
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "oneatlas_admin_session";
const SESSION_DURATION = 8 * 60 * 60; // 8 hours

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET must contain at least 32 characters."
    );
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function createSessionToken() {
  const payload = {
    authenticated: true,
    expiresAt: Date.now() + SESSION_DURATION * 1000,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  return `${encoded}.${sign(encoded)}`;
}

function verifySessionToken(token: string) {
  try {
    const parts = token.split(".");

    if (parts.length !== 2) return false;

    const [encoded, suppliedSignature] = parts;

    const expectedSignature = sign(encoded);

    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);

    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );

    return (
      payload.authenticated === true &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export async function createAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return false;

  return verifySessionToken(token);
}
