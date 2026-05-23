import { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import axios from "axios";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableCaption,
} from "@/Components/ui/table";
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

function normalizeWhatsappNumber(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
        return "";
    }

    if (digits.startsWith("62")) {
        return digits;
    }

    if (digits.startsWith("0")) {
        return `62${digits.slice(1)}`;
    }

    return digits;
}

const defaultEmailSubject = "Pengingat SPT Masa {{period}}";
const defaultEmailBody = `Yth. Bapak/Ibu Pimpinan {{company}},\n\nBerdasarkan pantauan sistem kami, Anda belum melakukan pelaporan SPT Masa untuk bulan {{period}} yang telah melewati jatuh tempo.\n\nMohon segera laporkan kewajiban perpajakan Anda (NPWP: {{npwp}}) sesegera mungkin.\n\nJika ada kendala, silakan hubungi kami.\n\nSalam,\n{{ar_name}} - Account Representative Anda`;
const defaultWhatsappBody = `Yth. Bapak/Ibu Pimpinan {{company}},\n\nMohon segera menindaklanjuti pelaporan SPT Masa untuk bulan {{period}} (NPWP: {{npwp}}). Jika butuh bantuan, silakan hubungi saya.\n\nTerima kasih.\n{{ar_name}}`;

function formatTemplate(template: string, row: AssignedRecord, arName: string) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, token) => {
        switch (token) {
            case "company":
                return row.taxpayer_name ?? row.npwp;
            case "npwp":
                return row.npwp;
            case "period":
                return formatMonthLabel(row.period_year, row.period_month);
            case "ar_name":
                return arName;
            default:
                return "";
        }
    });
}

export default function MyAssignments() {
    const page = usePage();
    const user = (
        (page.props as any)?.auth as { user?: { name: string } } | undefined
    )?.user ?? { name: "Account Representative Anda" };
    const [records, setRecords] = useState<AssignedRecord[]>([]);
    const [search, setSearch] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [emailSubject, setEmailSubject] = useState(defaultEmailSubject);
    const [emailBody, setEmailBody] = useState(defaultEmailBody);
    const [whatsappBody, setWhatsappBody] = useState(defaultWhatsappBody);

    useEffect(() => {
        const saved = window.localStorage.getItem("assignmentTemplates");
        if (!saved) {
            return;
        }

        try {
            const parsed = JSON.parse(saved);
            setEmailSubject(parsed.emailSubject ?? defaultEmailSubject);
            setEmailBody(parsed.emailBody ?? defaultEmailBody);
            setWhatsappBody(parsed.whatsappBody ?? defaultWhatsappBody);
        } catch {
            // invalid saved templates, ignore
        }
    }, []);

    const fetchRecords = async () => {
        try {
            const { data } = await axios.get<AssignedRecord[]>(
                "/api/assign-ar/my-records",
            );
            setRecords(data);
            setPageError(null);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                setPageError(
                    error.response?.data?.message ??
                        error.response?.statusText ??
                        error.message,
                );
            } else if (error instanceof Error) {
                setPageError(error.message);
            } else {
                setPageError("Unable to load assignments.");
            }
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const filteredRecords = useMemo(() => {
        if (!search.trim()) {
            return records;
        }

        const normalized = search.trim().toLowerCase();

        return records.filter((record) =>
            [record.npwp, record.taxpayer_name ?? ""]
                .join(" ")
                .toLowerCase()
                .includes(normalized),
        );
    }, [records, search]);

    const groupedAssignments = useMemo(() => {
        const groups: Record<string, AssignedRecord[]> = {};

        filteredRecords.forEach((record) => {
            const key = `${record.period_year}-${String(
                record.period_month,
            ).padStart(2, "0")}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(record);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredRecords]);

    return (
        <SidebarLayout>
            <div className="p-5">
                <div className="flex justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">My Assignments</h1>
                        <p className="text-sm text-muted-foreground">
                            View assigned companies by assignment month.
                        </p>
                    </div>
                </div>

                {pageError ? (
                    <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {pageError}
                    </div>
                ) : null}

                <div className="mt-10 bg-white rounded-md p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h4 className="text-lg font-medium">
                                Total assigned companies
                            </h4>
                            <p className="mt-1 text-3xl font-semibold">
                                {records.length}
                            </p>
                        </div>
                        <div className="w-full max-w-sm">
                            <Input
                                placeholder="Search by NPWP or name"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-10 space-y-8">
                    {groupedAssignments.length === 0 ? (
                        <div className="rounded-md bg-white p-6 shadow-sm">
                            <p className="text-sm text-muted-foreground">
                                No assignments found for the selected search or
                                assigned period.
                            </p>
                        </div>
                    ) : (
                        groupedAssignments.map(([periodKey, entries]) => {
                            const [year, month] = periodKey.split("-");
                            return (
                                <section
                                    key={periodKey}
                                    className="bg-white rounded-md p-6 shadow-sm"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold">
                                                {formatMonthLabel(
                                                    +year,
                                                    +month,
                                                )}
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                {entries.length} assigned
                                                company
                                                {entries.length === 1
                                                    ? ""
                                                    : "ies"}
                                            </p>
                                        </div>
                                    </div>

                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>NPWP</TableHead>
                                                <TableHead>Company</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>WhatsApp</TableHead>
                                                <TableHead>Contact</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((row) => {
                                                const whatsappNumber =
                                                    row.whatsapp_number
                                                        ? normalizeWhatsappNumber(
                                                              row.whatsapp_number,
                                                          )
                                                        : "";
                                                const subject = formatTemplate(
                                                    emailSubject,
                                                    row,
                                                    user.name,
                                                );
                                                const body = formatTemplate(
                                                    emailBody,
                                                    row,
                                                    user.name,
                                                );
                                                const whatsappText =
                                                    formatTemplate(
                                                        whatsappBody,
                                                        row,
                                                        user.name,
                                                    );
                                                const gmailHref = row.email
                                                    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                                                          row.email,
                                                      )}&su=${encodeURIComponent(
                                                          subject,
                                                      )}&body=${encodeURIComponent(
                                                          body,
                                                      )}`
                                                    : undefined;
                                                const whatsappHref =
                                                    whatsappNumber
                                                        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                                                              whatsappText,
                                                          )}`
                                                        : undefined;

                                                return (
                                                    <TableRow
                                                        key={`${row.npwp}-${periodKey}`}
                                                    >
                                                        <TableCell>
                                                            {row.npwp}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.taxpayer_name ??
                                                                "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.email ?? "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.whatsapp_number ??
                                                                "-"}
                                                        </TableCell>
                                                        <TableCell className="space-x-2">
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <a
                                                                    href={
                                                                        gmailHref ??
                                                                        "#"
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className={
                                                                        !gmailHref
                                                                            ? "pointer-events-none opacity-50"
                                                                            : undefined
                                                                    }
                                                                >
                                                                    Email
                                                                </a>
                                                            </Button>
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <a
                                                                    href={
                                                                        whatsappHref ??
                                                                        "#"
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className={
                                                                        !whatsappHref
                                                                            ? "pointer-events-none opacity-50"
                                                                            : undefined
                                                                    }
                                                                >
                                                                    WhatsApp
                                                                </a>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                        <TableCaption>
                                            Data is filtered by your assigned
                                            NIP and the selected month.
                                        </TableCaption>
                                    </Table>
                                </section>
                            );
                        })
                    )}
                </div>
            </div>
        </SidebarLayout>
    );
}
