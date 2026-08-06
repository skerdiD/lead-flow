import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";

export default async function SignInLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isSafeE2ETestMode()) return children;

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <ClerkProvider dynamic nonce={nonce}>
      {children}
    </ClerkProvider>
  );
}
