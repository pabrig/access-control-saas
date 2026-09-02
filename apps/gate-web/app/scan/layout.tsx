import { redirect } from "next/navigation";
import { GateSecurityTabBar } from "@/components/gate-security-tab-bar";
import { createClient } from "@/lib/supabase/server";

export default async function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      {children}
      <GateSecurityTabBar />
    </>
  );
}
