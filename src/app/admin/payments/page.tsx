import { QrCode, ShieldCheck } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { AdminPlanPayments } from "@/components/admin-plan-payments";
import { getPlanPaymentDetails } from "@/lib/plan-payments";
import { withDatabasePage } from "@/lib/with-database-page";

async function AdminPaymentsPage() {
  await requireAdminSession();
  const [payments, settings] = await Promise.all([
    prisma.planPayment.findMany({
      orderBy: { submittedAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    }),
    getPlanPaymentDetails(),
  ]);

  const rows = payments
    .map((payment) => ({
      id: payment.id,
      plan: payment.plan,
      amountMinor: payment.amountMinor,
      method: payment.method,
      reference: payment.reference,
      note: payment.note,
      status: payment.status,
      adminNote: payment.adminNote,
      submittedAt: payment.submittedAt.toISOString(),
      reviewedAt: payment.reviewedAt?.toISOString() ?? null,
      crafterName: payment.user.name,
      crafterEmail: payment.user.email,
    }))
    .sort((a, b) => {
      const order = (status: string) => (status === "pending" ? 0 : 1);
      return order(a.status) - order(b.status) || b.submittedAt.localeCompare(a.submittedAt);
    });

  return (
    <div className="admin-page">
      <span className="eyebrow"><QrCode size={13} /> RENEWAL PAYMENTS</span>
      <h1>Payment proofs</h1>
      <p>Set how crafters pay you, then check the screenshots they send for a renewal. Approving one renews the plan.</p>
      <AdminPlanPayments
        payments={rows}
        settings={{
          accountName: settings.accountName,
          gcashNumber: settings.gcashNumber,
          mayaNumber: settings.mayaNumber,
          bankDetails: settings.bankDetails,
          instructions: settings.instructions,
          qrPath: settings.qrPath,
        }}
      />
      <div className="admin-admin-note">
        <ShieldCheck size={15} /> Screenshots are private. Only the crafter who sent one and the admin can open it.
      </div>
    </div>
  );
}

export default withDatabasePage(AdminPaymentsPage);
