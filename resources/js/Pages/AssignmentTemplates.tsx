import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/Components/ui/input";
import { Textarea } from "@/Components/ui/textarea";
import { Button } from "@/Components/ui/button";
import SidebarLayout from "@/Layouts/SidebarLayout";

import { sptTypeLabel } from "@/lib/sptTypes";

interface AssignedRecord {
    npwp: string;
    taxpayer_name: string | null;
    email: string | null;
    whatsapp_number: string | null;
    period_year: number;
    period_month: number;
    spt_type: string | null;
}

function formatMonthLabel(year: number, month: number) {
    return new Date(year, month - 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
    });
}

export default function AssignmentTemplates() {
    const page = usePage();
    const user = (
        (page.props as any)?.auth as { user?: { name: string } } | undefined
    )?.user ?? { name: "Account Representative Anda" };

    const [emailSubject, setEmailSubject] = useState(
        "Pengingat SPT Masa {{spt_type}} {{period}}",
    );
    const [emailBody, setEmailBody] = useState(
        "Yth. Bapak/Ibu Pimpinan {{company}},\n\nBerdasarkan pantauan sistem kami, Anda belum melakukan pelaporan SPT Masa {{spt_type}} untuk bulan {{period}} yang telah melewati jatuh tempo.\n\nMohon segera laporkan kewajiban perpajakan Anda (NPWP: {{npwp}}) sesegera mungkin.\n\nJika ada kendala, silakan hubungi kami.\n\nSalam,\n{{ar_name}} - Account Representative Anda",
    );
    const [whatsappBody, setWhatsappBody] = useState(
        "Yth. Bapak/Ibu Pimpinan {{company}},\n\nMohon segera menindaklanjuti pelaporan SPT Masa {{spt_type}} untuk bulan {{period}} (NPWP: {{npwp}}). Jika butuh bantuan, silakan hubungi saya.\n\nTerima kasih.\n{{ar_name}}",
    );

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get("/api/assignment-templates");
                setEmailSubject(data.email_subject ?? emailSubject);
                setEmailBody(data.email_body ?? emailBody);
                setWhatsappBody(data.whatsapp_body ?? whatsappBody);
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    toast.error(
                        error.response?.data?.message ??
                            "Failed to load templates.",
                    );
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSaveTemplates = async () => {
        setSaving(true);
        try {
            await axios.put("/api/assignment-templates", {
                email_subject: emailSubject,
                email_body: emailBody,
                whatsapp_body: whatsappBody,
            });
            toast.success("Template saved successfully.");
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.message ??
                        "Failed to save templates.",
                );
            }
        } finally {
            setSaving(false);
        }
    };

    const sampleRecord: AssignedRecord = {
        npwp: "0123456789",
        taxpayer_name: "PT Contoh Sukses",
        email: "contoh@domain.com",
        whatsapp_number: "081234567890",
        period_year: 2026,
        period_month: 4,
        spt_type: "pph_21",
    };

    const formatTemplate = (template: string, row: AssignedRecord) => {
        return template.replace(/\{\{(\w+)\}\}/g, (_, token) => {
            switch (token) {
                case "company":
                    return row.taxpayer_name ?? row.npwp;
                case "npwp":
                    return row.npwp;
                case "period":
                    return formatMonthLabel(row.period_year, row.period_month);
                case "spt_type":
                    return sptTypeLabel(row.spt_type);
                case "ar_name":
                    return user?.name ?? "Account Representative Anda";
                default:
                    return "";
            }
        });
    };

    return (
        <SidebarLayout>
            <div className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">Assignment templates</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage message templates for email and WhatsApp
                            reminders.
                        </p>
                    </div>
                    <Button
                        onClick={handleSaveTemplates}
                        size="sm"
                        disabled={loading || saving}
                    >
                        {saving ? "Saving…" : "Save templates"}
                    </Button>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">
                            Email template
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Customize the Gmail subject and body for each
                            reminder. Use placeholders:{" "}
                            <code>{"{{company}}"}</code>,{" "}
                            <code>{"{{npwp}}"}</code>,{" "}
                            <code>{"{{period}}"}</code>,{" "}
                            <code>{"{{spt_type}}"}</code>,{" "}
                            <code>{"{{ar_name}}"}</code>.
                        </p>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Email subject
                                </label>
                                <Input
                                    value={emailSubject}
                                    onChange={(event) =>
                                        setEmailSubject(event.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Email body
                                </label>
                                <Textarea
                                    value={emailBody}
                                    onChange={(event) =>
                                        setEmailBody(event.target.value)
                                    }
                                    rows={8}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-md bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">
                            WhatsApp template
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Customize the WhatsApp message for each assigned
                            company.
                        </p>
                        <div className="mt-4">
                            <label className="mb-2 block text-sm font-medium">
                                WhatsApp body
                            </label>
                            <Textarea
                                value={whatsappBody}
                                onChange={(event) =>
                                    setWhatsappBody(event.target.value)
                                }
                                rows={10}
                            />
                        </div>
                    </div>
                </div>

                <section className="mt-8 rounded-md bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Preview</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This preview shows how the selected templates will
                        appear for a sample assigned company.
                    </p>
                    <div className="mt-6 space-y-4">
                        <div className="rounded-2xl border border-border bg-muted p-4">
                            <p className="text-sm font-semibold">Subject</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm">
                                {formatTemplate(emailSubject, sampleRecord)}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-muted p-4">
                            <p className="text-sm font-semibold">Email body</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm">
                                {formatTemplate(emailBody, sampleRecord)}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-muted p-4">
                            <p className="text-sm font-semibold">
                                WhatsApp body
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm">
                                {formatTemplate(whatsappBody, sampleRecord)}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </SidebarLayout>
    );
}
