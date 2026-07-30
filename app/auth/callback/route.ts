import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { safeReturnPath } from "../../../lib/auth";

const emailOtpTypes: EmailOtpType[] = [
  "email",
  "invite",
  "magiclink",
  "recovery",
  "signup",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type");
  const next = safeReturnPath(url.searchParams.get("next"), "/workspace");
  const supabase = await getSupabaseServerClient();

  const otpType = emailOtpTypes.find((type) => type === requestedType);
  if (tokenHash && otpType && supabase) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

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
