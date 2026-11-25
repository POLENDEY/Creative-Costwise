import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LockKeyhole } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatPlanDate,
  getPlanAccess,
  PLAN_FEATURES,
  planLabel,
  planLockMessage,
  planLockTitle,
  type PlanFeatureKey,
} from "@/lib/plan-features";
import { SignOutButton } from "@/components/sign-out-button";
import { withDatabasePage } from "@/lib/with-database-page";

async function PlanLockedPage({ searchParams }: { searchParams: Promise<{ feature?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, role: true, plan: true, expiresAt: true, disabledAt: true },
  });
  if (!user) redirect("/login");
  if (user.role !== "crafter") redirect("/admin/users");

  const { feature: requested } = await searchParams;
  const featureKey = requested && Object.prototype.hasOwnProperty.call(PLAN_FEATURES, requested)
    ? (requested as PlanFeatureKey)
    : null;
  const access = getPlanAccess(user);
  if (!access.limited || !access.reason) redirect(featureKey ? PLAN_FEATURES[featureKey].href : "/dashboard");

  const featureLabel = featureKey ? PLAN_FEATURES[featureKey].label : "These toolkit features";
  const endedOn = formatPlanDate(access.expiresAt);

  return (
    <main className="expired-screen plan-locked-page">
      <section className="expired-card">
        <span className="expired-mark"><LockKeyhole size={22} /></span>
        <span className="eyebrow">PLAN RENEWAL NEEDED</span>
        <h1>{planLockTitle(access.reason)}</h1>
        <p>{planLockMessage({ reason: access.reason, feature: featureLabel, plan: access.plan, expiresAt: access.expiresAt })}</p>
        <span className="plan-locked-plan">{planLabel(access.plan)} plan{access.reason === "expired" && endedOn ? ` · ended ${endedOn}` : ""}</span>
        <div className="expired-actions">
          <Link className="button button-primary" href="/pricing">See plans &amp; pricing</Link>
          <Link className="button button-secondary" href="/dashboard">Back to overview</Link>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}

export default withDatabasePage(PlanLockedPage);
