import { CustomerBook } from "@/components/customer-book";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { withDatabasePage } from "@/lib/with-database-page";

async function CustomersPage() {
  const user = await requireCrafter();
  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return <div className="feature-page">
    <div className="page-heading">
      <div><span className="eyebrow">YOUR PEOPLE</span><h1>Customers</h1><p>Save a name once, then pick it when you start an order.</p></div>
    </div>
    <CustomerBook customers={customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
    }))} />
  </div>;
}

export default withDatabasePage(CustomersPage);
