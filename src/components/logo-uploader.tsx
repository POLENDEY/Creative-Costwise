"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { uploadShopLogo } from "@/actions/shop";

export function LogoUploader({ logoPath }: { logoPath: string | null }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function submit(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      try {
        await uploadShopLogo(formData);
        setMessage("Your business logo is saved.");
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : "The logo could not be uploaded.");
      }
    });
  }

  return <section className="panel logo-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR BRAND</span><h2>A familiar face for your business</h2><p>Upload an optional logo. JPEG, PNG, or WebP images up to 2 MB are automatically converted to AVIF.</p></div></div><div className="logo-upload-row">{logoPath ? <Image className="uploaded-business-logo" src={logoPath} alt="Your business logo" width={76} height={76} /> : <span className="logo-placeholder"><ImagePlus size={22} /></span>}<form action={submit} className="logo-upload-form"><label className="field">Business logo<input type="file" name="logo" accept="image/jpeg,image/png,image/webp" required /></label><button className="button button-secondary" disabled={pending}><Upload size={15} />{pending ? "Uploading…" : "Upload logo"}</button></form></div>{message && <p className="logo-upload-message" role="status">{message}</p>}</section>;
}
