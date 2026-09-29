import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { findUserById } from "@/lib/store";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;
  const user = userId ? findUserById(userId) : undefined;
  if (!user) redirect("/login");

  return <DashboardClient username={user.username} />;
}
