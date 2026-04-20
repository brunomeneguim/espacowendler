import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Adiciona o pathname nos headers do request para que server components possam lê-lo
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const modifiedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
  });

  return await updateSession(modifiedRequest);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
