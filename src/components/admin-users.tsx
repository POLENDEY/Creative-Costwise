"use client";

import { useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
import { createCrafter, updateCrafterAccess } from "@/app/actions";

type UserRow = {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  expiresAt: string | null;
  disabledAt: string | null;
};

function accessStatus(user: UserRow) {
  if (user.disabledAt) return "Disabled";
  if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) return "Expired";
  return "Active";
}

export function AdminUsers({ users }: { users: UserRow[] }) {
  const [password, setPassword] = useState("");
  const [passwordFor, setPasswordFor] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError("");
    setPassword("");
    startTransition(async () => {
      try {
        const result = await createCrafter(formData);
        setPassword(result.temporaryPassword);
        setPasswordFor({ name: result.crafterName, email: result.crafterEmail });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "The account could not be created.");
      }
    });
  }

  return <>
    <section className="admin-create-card"><h2>Create a crafter login</h2><form action={submit} className="admin-form"><label className="field">Crafter name<input name="name" required maxLength={100} placeholder="Name" /></label><label className="field">Email address<input name="email" type="email" required placeholder="crafter@example.com" /></label><label className="field">Plan<select name="plan" defaultValue="quarterly"><option value="quarterly">Quarterly · 3 months</option><option value="annual">Annual · 1 year</option></select></label><button className="button button-primary" disabled={busy}><UserPlus size={15} /> {busy ? "Creating…" : "Create login"}</button></form>{error && <p className="form-error" role="alert">{error}</p>}{password && passwordFor && <div className="temporary-password"><b>Temporary password for {passwordFor.name} ({passwordFor.email})</b><code>{password}</code><button className="button button-secondary" onClick={() => navigator.clipboard.writeText(password)}><Copy size={14} /> Copy once and share securely</button><small>Share this password securely with {passwordFor.name}. They will be asked to change it at first sign-in.</small></div>}</section>
    <section className="admin-users-card"><h2>Shop accounts <span>({users.length})</span></h2>{users.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Crafter</th><th>Email</th><th>Plan</th><th>Expires</th><th>Status</th><th>Access</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><b>{user.name}</b></td><td>{user.email}</td><td><form action={updateCrafterAccess} className="inline-admin-action"><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="action" value="change-plan" /><select name="plan" defaultValue={user.plan ?? "quarterly"} aria-label={`Plan for ${user.name}`}><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select><button className="admin-mini-button" type="submit">Save</button></form></td><td>{user.expiresAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(user.expiresAt)) : "—"}</td><td><span className={`status-pill status-${accessStatus(user).toLowerCase()}`}>{accessStatus(user)}</span></td><td><div className="admin-row-actions"><form action={updateCrafterAccess}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="action" value="renew" /><button className="admin-mini-button" type="submit">Renew</button></form><form action={updateCrafterAccess}><input type="hidden" name="userId" value={user.id} /><input type="hidden" name="action" value={user.disabledAt ? "enable" : "disable"} /><button className="admin-mini-button" type="submit">{user.disabledAt ? "Enable" : "Disable"}</button></form></div></td></tr>)}</tbody></table></div> : <p className="admin-empty">No crafter accounts yet. Create the first login above.</p>}</section>
  </>;
}
