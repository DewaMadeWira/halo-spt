import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { toast } from "sonner";
import { Input } from "@/Components/ui/input";
import { Textarea } from "@/Components/ui/textarea";
import { Button } from "@/Components/ui/button";
import SidebarLayout from "@/Layouts/SidebarLayout";

interface AssignedRecord {
    npwp: string;
    taxpayer_name: string | null;
    email: string | null;
    whatsapp_number: string | null;
    period_year: number;
    period_month: number;
}

function formatMonthLabel(year: number, month: number) {
    return new Date(year, month - 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
    });
}

export default function AssignmentTemplates() {
    const page = usePage();
    const user = ((page.props as any)?.auth as { user?: { name: string } } | undefined)
        ?.user ?? { name: "Account Representative Anda" };

    const [emailSubject, setEmailSubject] = useState(
        "Pengingat SPT Masa {{period}}",
    );
    const [emailBody, setEmailBody] = useState(
        "Yth. Bapak/Ibu Pimpinan {{company}},\n\nBerdasarkan pantauan sistem kami, Anda belum melakukan pelaporan SPT Masa untuk bulan {{period}} yang telah melewati jatuh tempo.\n\nMohon segera laporkan kewajiban perpajakan Anda (NPWP: {{npwp}}) sesegera mungkin.\n\nJika ada kendala, silakan hubungi kami.\n\nSalam,\n{{ar_name}} - Account Representative Anda",
    );
    const [whatsappBody, setWhatsappBody] = useState(
        "Yth. Bapak/Ibu Pimpinan {{company}},\n\nMohon segera menindaklanjuti pelaporan SPT Masa untuk bulan {{period}} (NPWP: {{npwp}}). Jika butuh bantuan, silakan hubungi saya.\n\nTerima kasih.\n{{ar_name}}",
    );

    useEffect(() => {
        const saved = window.localStorage.getItem(
            "assignmentTemplates",
        );
        if (!saved) {
            return;
        }

        try {
            const parsed = JSON.parse(saved);
            setEmailSubject(parsed.emailSubject ?? emailSubject);
            setEmailBody(parsed.emailBody ?? emailBody);
            setWhatsappBody(parsed.whatsappBody ?? whatsappBody);
        } catch {
            // ignore invalid stored value
        }
    }, []);

    const handleSaveTemplates = () => {
        const payload = {
            emailSubject,
            emailBody,
            whatsappBody,
        };
        window.localStorage.setItem(
            "assignmentTemplates",
            JSON.stringify(payload),
        );
        toast.success("Template saved successfully.");
    };

    const sampleRecord: AssignedRecord = {
        npwp: "0123456789",
        taxpayer_name: "PT Contoh Sukses",
        email: "contoh@domain.com",
        whatsapp_number: "081234567890",
        period_year: 2026,
        period_month: 4,
    };

    const formatTemplate = (
        template: string,
        row: AssignedRecord,
    ) => {
        return template.replace(/\{\{(\w+)\}\}/g, (_, token) => {
            switch (token) {
                case "company":
                    return row.taxpayer_name ?? row.npwp;
                case "npwp":
                    return row.npwp;
                case "period":
                    return formatMonthLabel(row.period_year, row.period_month);
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
                            Manage message templates for email and WhatsApp reminders.
                        </p>
                    </div>
                    <Button onClick={handleSaveTemplates} size="sm">
                        Save templates
                    </Button>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">Email template</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Customize the Gmail subject and body for each reminder.
                            Use placeholders: <code>{"{{company}}"}</code>, <code>{"{{npwp}}"}</code>, <code>{"{{period}}"}</code>, <code>{"{{ar_name}}"}</code>.
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
                        <h3 className="text-lg font-semibold">WhatsApp template</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Customize the WhatsApp message for each assigned company.
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
                        This preview shows how the selected templates will appear for a sample assigned company.
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
                            <p className="text-sm font-semibold">WhatsApp body</p>
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
