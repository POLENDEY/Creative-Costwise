"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { saveCustomer } from "@/actions/customers";
import { userFacingError } from "@/lib/user-facing-error";

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
  const [editing, setEditing] = useState("");
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
      {visible.length ? <ul className="record-list">{visible.map((customer) => {
        const contact = [customer.phone, customer.email, customer.address].filter(Boolean);
        return <li className="record-card" key={customer.id}>
          <div className="record-main">
            <b>{customer.name}</b>
            <p className="record-meta">{contact.length ? contact.map((item) => <span key={item}>{item}</span>) : <span>No contact details yet</span>}</p>
          </div>
          <div className="record-actions">
            <button type="button" className="button button-secondary" aria-expanded={editing === customer.id} onClick={() => setEditing((current) => current === customer.id ? "" : customer.id)}>{editing === customer.id ? "Close" : "Edit"}</button>
          </div>
          {editing === customer.id && <div className="record-editor"><CustomerForm key={`${customer.name}|${customer.phone}|${customer.email}|${customer.address}|${customer.notes}`} customer={customer} onError={setError} /></div>}
        </li>;
      })}</ul> : <p className="empty-copy">{customers.length ? "No customers match this search." : "Add a customer when you want their details ready for the next order."}</p>}
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
      onError(userFacingError(cause, "Could not save this customer."));
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
