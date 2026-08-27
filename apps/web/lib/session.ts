import { redirect } from "next/navigation";
import type { Database } from "@repo/db";
import { createClient } from "@/lib/supabase/server";

export type Role = Database["public"]["Enums"]["role"];

export type RoleRow = {
  id: string;
  role: Role;
  complex_id: string | null;
  neighborhood_id: string | null;
  property_id: string | null;
};

export type Session = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleRow[];
};

const ADMIN_ROLES: Role[] = [
  "SUPERADMIN",
  "COMPLEX_ADMIN",
  "NEIGHBORHOOD_ADMIN",
];

export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("id, role, complex_id, neighborhood_id, property_id")
      .eq("user_id", user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? "",
    firstName: profile?.first_name ?? "Hola",
    lastName: profile?.last_name ?? "",
    roles: (roles ?? []) as RoleRow[],
  };
}

export function hasRole(session: Session, ...roles: Role[]) {
  return session.roles.some((row) => roles.includes(row.role));
}

export function isAdmin(session: Session) {
  return hasRole(session, ...ADMIN_ROLES);
}

export function isSuperadmin(session: Session) {
  return hasRole(session, "SUPERADMIN");
}

export function canCreateNeighborhood(session: Session) {
  return hasRole(session, "SUPERADMIN", "COMPLEX_ADMIN");
}

export function isOwner(session: Session) {
  return hasRole(session, "OWNER");
}

export function isSecurity(session: Session) {
  return hasRole(session, "SECURITY");
}

export function primaryRole(session: Session): Role | null {
  const order: Role[] = [
    "SUPERADMIN",
    "COMPLEX_ADMIN",
    "NEIGHBORHOOD_ADMIN",
    "OWNER",
    "SECURITY",
  ];

  return order.find((role) => hasRole(session, role)) ?? null;
}

export async function requireAdmin() {
  const session = await requireSession();

  if (!isAdmin(session)) {
    redirect("/");
  }

  return session;
}

export async function requireSuperadmin() {
  const session = await requireSession();

  if (!isSuperadmin(session)) {
    redirect("/");
  }

  return session;
}
