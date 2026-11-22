import { ArrowRight, Check, Moon, Palette, Sun } from "lucide-react";
import { saveSettings } from "@/actions/shop";
import { prisma } from "@/lib/prisma";
import { requireCrafter } from "@/lib/session";
import { LogoUploader } from "@/components/logo-uploader";

const themes = [
  ["pink", "#BE185D", "Pink"],
  ["purple", "#7E22CE", "Purple"],
  ["green", "#15803D", "Green"],
  ["blue", "#1D4ED8", "Blue"],
  ["red", "#B91C1C", "Red"],
  ["beige", "#92400E", "Beige"],
  ["orange", "#C2410C", "Orange"],
  ["gray", "#334155", "Gray"],
  ["black", "#171717", "Black"],
] as const;

export default async function SettingsPage() {
  const user = await requireCrafter();
  const settings = await prisma.shopSettings.findUnique({ where: { userId: user.id } });
  return (
    <div className="feature-page settings-page">
      <div className="page-heading"><div><span className="eyebrow">MAKE THIS SPACE YOURS</span><h1>Shop <em>settings</em></h1><p>Your preferences and business details, all in one place.</p></div></div>
      <form action={saveSettings} className="settings-form">
        <section className="panel settings-panel">
          <div className="panel-heading"><div><span className="eyebrow">LOOK &amp; FEEL</span><h2>Make it feel like you</h2><p>Choose your currency, a color that inspires you, and a light or dark workspace.</p></div><Palette className="settings-heading-icon" size={22} /></div>
          <label className="field settings-currency-field">Preferred currency<span>All your product costs and prices use this currency. We never convert between currencies.</span><select name="currency" defaultValue={settings?.currency ?? "PHP"}><option value="PHP">Philippine peso (PHP ₱)</option><option value="USD">US dollar (USD $)</option></select></label>
          <fieldset className="theme-fieldset"><legend>Color theme</legend><p>Same accent color in light or dark mode.</p><div className="theme-options">{themes.map(([value, color, label]) => <label className="theme-option" key={value}><input type="radio" name="theme" value={value} defaultChecked={(settings?.theme ?? "pink") === value} /><span className="theme-swatch" style={{ backgroundColor: color }}><Check size={15} /></span><span>{label}</span></label>)}</div></fieldset>
          <fieldset className="scheme-fieldset"><legend>Color scheme</legend><div className="scheme-options"><label className="scheme-option"><input type="radio" name="colorScheme" value="light" defaultChecked={(settings?.colorScheme ?? "light") === "light"} /><span><Sun size={18} /><b>Light</b><small>Bright and airy</small></span></label><label className="scheme-option"><input type="radio" name="colorScheme" value="dark" defaultChecked={settings?.colorScheme === "dark"} /><span><Moon size={18} /><b>Dark</b><small>Easy on the eyes</small></span></label></div></fieldset>
        </section>
        <section className="panel settings-panel">
          <div className="panel-heading"><div><span className="eyebrow">YOUR BUSINESS</span><h2>The details that make it yours</h2><p>Your name and contact details can appear on future invoices and receipts.</p></div></div>
          <div className="form-grid">
            <label className="field field-span-2">Business name<input name="businessName" defaultValue={settings?.businessName ?? ""} placeholder="Your studio or shop name" maxLength={100} /></label>
            <label className="field">Business email<input name="businessEmail" type="email" defaultValue={settings?.businessEmail ?? ""} placeholder="hello@yourbusiness.com" /></label>
            <label className="field">Business phone<input name="businessPhone" defaultValue={settings?.businessPhone ?? ""} placeholder="+63 900 000 0000" maxLength={40} /></label>
            <label className="field field-span-2">Business address<textarea name="businessAddress" defaultValue={settings?.businessAddress ?? ""} placeholder="Your business mailing address" rows={3} maxLength={300} /></label>
          </div>
        </section>
        <section className="panel settings-panel">
          <div className="panel-heading"><div><span className="eyebrow">PAYMENT DETAILS</span><h2>Make paying you simple</h2><p>These are optional details you may include on your future documents.</p></div></div>
          <div className="form-grid"><label className="field">Account name<input name="paymentAccountName" defaultValue={settings?.paymentAccountName ?? ""} placeholder="Name on the account" maxLength={100} /></label><label className="field">GCash number<input name="gcashNumber" defaultValue={settings?.gcashNumber ?? ""} placeholder="09xx xxx xxxx" maxLength={40} /></label><label className="field field-span-2">Bank details<textarea name="bankDetails" defaultValue={settings?.bankDetails ?? ""} rows={3} placeholder="Bank name, account number, or payment instructions" maxLength={300} /></label></div>
        </section>
        <div className="settings-submit-row"><span><Check size={15} /> Your choices are saved to this shop.</span><button className="button button-primary" type="submit">Save changes <ArrowRight size={16} /></button></div>
      </form>
      <LogoUploader logoPath={settings?.logoPath ?? null} />
    </div>
  );
}
