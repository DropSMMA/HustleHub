import type { Viewport } from "next";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSEOTags } from "@/libs/seo";
import { auth } from "@/libs/next-auth";
import config from "@/config";

export const metadata = getSEOTags({
  extraTags: {
    themeColor: config.colors.main,
    appleWebApp: {
      capable: true,
      title: config.appName,
      statusBarStyle: "black",
    },
  },
});

export const viewport: Viewport = {
  themeColor: config.colors.main,
};

// This is a server-side component to ensure the user is logged in.
// If not, it will redirect to the login page.
// It's applied to all subpages of /dashboard in /app/dashboard/*** pages
// You can also add custom static UI elements like a Navbar, Sidebar, Footer, etc..
// See https://shipfa.st/docs/tutorials/private-page
export default async function LayoutPrivate({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect(config.auth.loginUrl);
  }

  return <>{children}</>;
}
