import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

export type Session = {
  token: string;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
};

const COOKIE_NAME = "sf_session";
const TTL_SECONDS = 60 * 60 * 8; // 8h

function password(): string {
  const pw = process.env.COOKIE_SECRET;
  if (!pw || pw.length < 32) {
    throw new Error("COOKIE_SECRET must be set and at least 32 characters long.");
  }
  return pw;
}

export async function setSession(session: Session): Promise<void> {
  const sealed = await sealData(session, { password: password(), ttl: TTL_SECONDS });
  cookies().set(COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function getSession(): Promise<Session | null> {
  const c = cookies().get(COOKIE_NAME);
  if (!c?.value) return null;
  try {
    const data = await unsealData<Session>(c.value, { password: password(), ttl: TTL_SECONDS });
    if (!data?.token) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  cookies().delete(COOKIE_NAME);
}
