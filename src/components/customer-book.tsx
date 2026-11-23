"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { saveCustomer } from "@/actions/customers";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export function CustomerBook({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) => [customer.name, customer.phone, customer.email, customer.address].join(" ").toLowerCase().includes(needle));
  }, [customers, query]);

  return <div className="stack-sections">
    <section className="panel">
      <div className="panel-heading library-heading">
        <div><span className="eyebrow">CUSTOMER BOOK</span><h2>People you make things for</h2></div>
        <span className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, or email" aria-label="Search customers" /></span>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {visible.length ? <ul className="movement-list">{visible.map((customer) => <li key={customer.id}>
        <div><b>{customer.name}</b><small>{[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details yet"}</small>{customer.address && <small>{customer.address}</small>}</div>
        <details>
          <summary>Edit</summary>
          <CustomerForm key={`${customer.name}|${customer.phone}|${customer.email}|${customer.address}|${customer.notes}`} customer={customer} onError={setError} />
        </details>
      </li>)}</ul> : <p className="empty-copy">{customers.length ? "No customers match this search." : "Add a customer when you want their details ready for the next order."}</p>}
    </section>
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">NEW CUSTOMER</span><h2>Add someone</h2></div></div>
      <CustomerForm onError={setError} />
    </section>
  </div>;
}

function CustomerForm({ customer, onError }: { customer?: CustomerRow; onError: (message: string) => void }) {
  const [pending, setPending] = useState(false);
  return <form className="form-grid" action={async (formData) => {
    onError("");
    setPending(true);
    try {
      await saveCustomer(formData);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Could not save this customer.");
    } finally {
      setPending(false);
    }
  }}>
    {customer && <input type="hidden" name="id" value={customer.id} />}
    <label className="field">Name<input name="name" defaultValue={customer?.name} required maxLength={120} /></label>
    <label className="field">Phone<input name="phone" defaultValue={customer?.phone} maxLength={40} /></label>
    <label className="field">Email<input name="email" type="email" defaultValue={customer?.email} maxLength={120} /></label>
    <label className="field">Address<input name="address" defaultValue={customer?.address} maxLength={300} /></label>
    <label className="field field-span-2">Notes<textarea name="notes" defaultValue={customer?.notes} maxLength={500} rows={3} /></label>
    <div className="form-actions"><span>The same email or phone is saved once.</span><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : customer ? "Save changes" : "Save customer"}</button></div>
  </form>;
}
