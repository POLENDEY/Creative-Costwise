import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPlanAccess,
  PLAN_FEATURES,
  planLockMessage,
  type PlanFeatureKey,
} from "@/lib/plan-features";

export async function requireCrafter(feature?: PlanFeatureKey) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "crafter") redirect("/admin/users");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      expiresAt: true,
      disabledAt: true,
      mustChangePassword: true,
      plan: true,
      welcomedAt: true,
    },
  });
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");

  const access = getPlanAccess(user);
  if (feature && access.limited) redirect(`/plan-locked?feature=${feature}`);

  return { ...user, access };
}

export async function requirePlanFeature(feature: PlanFeatureKey) {
  const user = await requireCrafter();
  if (user.access.limited && user.access.reason) {
    throw new Error(planLockMessage({
      reason: user.access.reason,
      feature: PLAN_FEATURES[feature].label,
      plan: user.access.plan,
      expiresAt: user.access.expiresAt,
    }));
  }
  return user;
}
