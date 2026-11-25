import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { withDatabasePage } from "@/lib/with-database-page";

async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  redirect(session.user.role === "admin" ? "/admin/users" : "/dashboard");
}

export default withDatabasePage(HomePage);
