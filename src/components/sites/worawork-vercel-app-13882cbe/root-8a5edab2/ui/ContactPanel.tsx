"use client";

import { useState } from "react";
import { useWoraWorkStore } from "../store";
import { Modal } from "./Modal";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactPanel() {
  const mailboxOpen = useWoraWorkStore((s) => s.mailboxOpen);
  const setMailboxOpen = useWoraWorkStore((s) => s.setMailboxOpen);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    // ponytail: demo-only mock submit, no real backend wired up for this clone
    setTimeout(() => {
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    }, 600);
  };

  return (
    <Modal open={mailboxOpen} onClose={() => setMailboxOpen(false)} className="ww-modal ww-mailbox-modal">
      <button className="ww-modal-close" onClick={() => setMailboxOpen(false)} aria-label="Close">
        ×
      </button>
      <h2>Leave a Message</h2>
      <form className="ww-contact-form" onSubmit={onSubmit}>
        <label>
          Name
          <input name="name" value={form.name} onChange={onChange} required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={onChange} required />
        </label>
        <label>
          Message
          <textarea name="message" value={form.message} onChange={onChange} rows={4} required />
        </label>
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending..." : "Send"}
        </button>
        {status === "sent" && <p className="ww-form-status">Message sent! (demo only)</p>}
      </form>
    </Modal>
  );
}
