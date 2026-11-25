import { Library } from "lucide-react";
import { ResourceForm } from "@/components/resource-form";
import { deleteTemplateEntry, saveResourceLinks, saveTemplateEntry } from "@/actions/resources";
import { requireAdminSession } from "@/lib/admin-session";
import { RESOURCE_SETTINGS_ID } from "@/lib/resources";
import { prisma } from "@/lib/prisma";
import { withDatabasePage } from "@/lib/with-database-page";

async function AdminResourcesPage() {
  await requireAdminSession();
  const [settings, templates, wishes] = await Promise.all([
    prisma.resourceSettings.findUnique({ where: { id: RESOURCE_SETTINGS_ID } }),
    prisma.templateEntry.findMany({ orderBy: { name: "asc" } }),
    prisma.templateWish.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="admin-page">
      <span className="eyebrow"><Library size={13} /> RESOURCES</span>
      <h1>Resource links and templates</h1>
      <p>Leave a field blank when that destination is not ready. The toolkit will not invent a link.</p>

      <section className="panel">
        <h2>Provider links</h2>
        <ResourceForm action={saveResourceLinks} submitLabel="Save links">
          <label className="field field-span-2">
            Master list template
            <input name="masterTemplateUrl" defaultValue={settings?.masterTemplateUrl ?? ""} placeholder="https://docs.google.com/spreadsheets/…" />
          </label>
          <label className="field field-span-2">
            Community
            <input name="communityUrl" defaultValue={settings?.communityUrl ?? ""} placeholder="https://" />
          </label>
          <label className="field">
            Terms
            <input name="termsUrl" defaultValue={settings?.termsUrl ?? ""} placeholder="https://" />
          </label>
          <label className="field">
            Privacy
            <input name="privacyUrl" defaultValue={settings?.privacyUrl ?? ""} placeholder="https://" />
          </label>
        </ResourceForm>
      </section>

      <section className="panel">
        <h2>Add a template</h2>
        <ResourceForm action={saveTemplateEntry} submitLabel="Add template" resetOnSuccess>
          <label className="field">
            Name
            <input name="name" required maxLength={120} />
          </label>
          <label className="field">
            Category
            <input name="category" maxLength={60} />
          </label>
          <label className="field field-span-2">
            Grab-it link
            <input name="url" required placeholder="https://" />
          </label>
          <label className="field field-span-2">
            Preview image link
            <input name="imageUrl" placeholder="https://" />
          </label>
        </ResourceForm>
        {templates.length === 0 ? <p>No templates yet.</p> : (
          <ul className="wish-list">
            {templates.map((template) => (
              <li key={template.id}>
                <b>{template.name}</b>
                <span>{template.category || "Uncategorized"}</span>
                <p><a href={template.url} target="_blank" rel="noreferrer">{template.url}</a></p>
                <ResourceForm action={deleteTemplateEntry} submitLabel="Remove" secondary>
                  <input type="hidden" name="id" value={template.id} />
                </ResourceForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Wish list</h2>
        {wishes.length === 0 ? <p>No requests yet.</p> : (
          <ul className="wish-list">
            {wishes.map((wish) => (
              <li key={wish.id}>
                <b>{wish.title}</b>
                <span>{wish.user.name} · {wish.user.email} · {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(wish.createdAt)}</span>
                {wish.details ? <p>{wish.details}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default withDatabasePage(AdminResourcesPage);
