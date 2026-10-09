"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Save, Loader2, Mail, Phone, Building, MapPin, User, UserX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

type Client = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
};

/** Field label with a small leading icon. */
function IconLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-fg-subtle" aria-hidden>
        {icon}
      </span>
      {children}
    </span>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
  });

  const loadClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setClient(data);
      setForm({
        full_name: data.full_name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
        address: data.address ?? "",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await loadClient();
        toast.success("Client Updated", "Changes saved successfully.");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Update Failed", err.error || "Could not update client.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network Error", "Could not connect to server.");
    } finally {
      setSaving(false);
    }
  }

  const backLink = (
    <Link href="/clients" className="btn btn-ghost btn-sm self-start">
      <ArrowLeft size={14} aria-hidden /> All Clients
    </Link>
  );

  if (loading) {
    return <LoadingState label="Loading client..." />;
  }

  if (!client) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          icon={<UserX size={28} />}
          title="Client not found"
          description="It may have been deleted, or the link is wrong."
        />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      {backLink}

      <PageHeader title={client.full_name} description={client.company || undefined} />

      <Panel title="Client details" icon={<User size={16} />}>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label={<IconLabel icon={<User size={12} />}>Full Name</IconLabel>}
              htmlFor="client-full-name"
              required
              className="sm:col-span-2"
            >
              <TextInput
                id="client-full-name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </Field>
            <Field label={<IconLabel icon={<Mail size={12} />}>Email</IconLabel>} htmlFor="client-email">
              <TextInput
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label={<IconLabel icon={<Phone size={12} />}>Phone</IconLabel>} htmlFor="client-phone">
              <TextInput
                id="client-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field
              label={<IconLabel icon={<Building size={12} />}>Company</IconLabel>}
              htmlFor="client-company"
              className="sm:col-span-2"
            >
              <TextInput
                id="client-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </Field>
            <Field
              label={<IconLabel icon={<MapPin size={12} />}>Address</IconLabel>}
              htmlFor="client-address"
              className="sm:col-span-2"
            >
              <TextArea
                id="client-address"
                className="min-h-20"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex justify-end border-t border-line pt-4">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
