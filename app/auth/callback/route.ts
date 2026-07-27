import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { safeReturnPath } from "../../../lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeReturnPath(url.searchParams.get("next"), "/account");
  const supabase = await getSupabaseServerClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const errorUrl = new URL("/login", url.origin);
  errorUrl.searchParams.set(
    "error",
    supabase
      ? "We could not complete that sign-in. Please try again."
      : "Authentication is not configured.",
  );
  return NextResponse.redirect(errorUrl);
}
