import type { Metadata } from "next";
import "./globals.css";
import { isIsolatedHostedPreview } from "@/server/accounts/preview";
export const metadata: Metadata = {
  title: { default: "GrantPath — A clearer path to your next chapter", template: "%s · GrantPath" },
  description:
    "Discover real scholarships, understand your eligibility, and turn opportunity into a plan. Official evidence. Clear next steps.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:p-3"
        >
          Skip to content
        </a>
        {isIsolatedHostedPreview() && (
          <div
            role="note"
            className="border-b border-amber-300 bg-amber-50 px-5 py-2 text-center text-xs leading-5 text-amber-950"
          >
            Preview · Email delivery is unavailable. Use a provided test account to explore.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
