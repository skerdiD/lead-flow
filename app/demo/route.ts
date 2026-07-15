import { NextResponse } from "next/server";
import { createDemoSignInUrl } from "@/lib/demo.server";

export async function GET(request: Request) {
  try {
    const demoSignInUrl = await createDemoSignInUrl();
    return NextResponse.redirect(demoSignInUrl);
  } catch {
    const fallbackUrl = new URL("/sign-in", request.url);
    fallbackUrl.searchParams.set("demo", "unavailable");
    return NextResponse.redirect(fallbackUrl);
  }
}
