import { PromotionDesk } from "@/components/promotion-desk";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { resolveCurrency } from "@/lib/money";

export default async function PromotionsPage() {
  const user = await requireCrafter();
  const [settings, promotions] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { userId: user.id } }),
    prisma.promotion.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">A PRICE WITH A REASON</span><h1>Promotions</h1><p>See the sale price, then save the note and the code if you want them later.</p></div>
    </div>
    <PromotionDesk
      currency={resolveCurrency(settings?.currency)}
      promotions={promotions.map((promotion) => ({
        id: promotion.id,
        code: promotion.code,
        originalMinor: promotion.originalMinor,
        discountMinor: promotion.discountMinor,
        saleMinor: promotion.saleMinor,
        note: promotion.note,
        upcomingNote: promotion.upcomingNote,
      }))}
    />
  </div>;
}
