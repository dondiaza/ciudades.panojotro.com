import { NextRequest, NextResponse } from "next/server";

import {
  buildSessionCookie,
  createSessionToken,
  sanitizeRedirectPath,
  validateLoginCredentials,
} from "@/lib/auth";

function formValue(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const username = formValue(formData.get("username"));
  const password = formValue(formData.get("password"));
  const from = sanitizeRedirectPath(formValue(formData.get("from")));

  const isValid = await validateLoginCredentials(username, password);
  if (!isValid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "1");
    if (from !== "/") {
      loginUrl.searchParams.set("from", from);
    }
    return NextResponse.redirect(loginUrl, 303);
  }

  const token = await createSessionToken(username);
  const response = NextResponse.redirect(new URL(from, request.url), 303);
  response.cookies.set(buildSessionCookie(token));
  return response;
}
