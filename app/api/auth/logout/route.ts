import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function GET(req: Request) {
  clearSession();
  return NextResponse.redirect(new URL("/login", new URL(req.url).origin));
}

export const POST = GET;
