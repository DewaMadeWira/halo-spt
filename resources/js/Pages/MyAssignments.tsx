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

type TaskStatus = "pending" | "contacted" | "done";

interface SptRecord {
    id: number;
    npwp: string;
    taxpayer_name: string | null;
    email: string | null;
    whatsapp_number: string | null;
    period_year: number;
    period_month: number;
    status: TaskStatus;
    contacted_at: string | null;
    done_at: string | null;
    notes: string | null;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
    pending: "Pending",
    contacted: "Contacted",
    done: "Done",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    contacted: "bg-blue-100 text-blue-800",
    done: "bg-green-100 text-green-800",
};

function StatusBadge({ status }: { status: TaskStatus }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
        >
            {STATUS_LABEL[status]}
        </span>
    );
}

function formatMonthLabel(year: number, month: number) {
    return new Date(year, month - 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
    });
}

function normalizeWhatsappNumber(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("62")) return digits;
    if (digits.startsWith("0")) return `62${digits.slice(1)}`;
    return digits;
}

const defaultEmailSubject = "Pengingat SPT Masa {{period}}";
const defaultEmailBody = `Yth. Bapak/Ibu Pimpinan {{company}},\n\nBerdasarkan pantauan sistem kami, Anda belum melakukan pelaporan SPT Masa untuk bulan {{period}} yang telah melewati jatuh tempo.\n\nMohon segera laporkan kewajiban perpajakan Anda (NPWP: {{npwp}}) sesegera mungkin.\n\nJika ada kendala, silakan hubungi kami.\n\nSalam,\n{{ar_name}} - Account Representative Anda`;
const defaultWhatsappBody = `Yth. Bapak/Ibu Pimpinan {{company}},\n\nMohon segera menindaklanjuti pelaporan SPT Masa untuk bulan {{period}} (NPWP: {{npwp}}). Jika butuh bantuan, silakan hubungi saya.\n\nTerima kasih.\n{{ar_name}}`;

function formatTemplate(template: string, row: SptRecord, arName: string) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, token) => {
        switch (token) {
            case "company": return row.taxpayer_name ?? row.npwp;
            case "npwp": return row.npwp;
            case "period": return formatMonthLabel(row.period_year, row.period_month);
            case "ar_name": return arName;
            default: return "";
        }
    });
}

export default function MyAssignments() {
    const page = usePage();
    const user = (
        (page.props as any)?.auth as { user?: { name: string } } | undefined
    )?.user ?? { name: "Account Representative Anda" };

    const [records, setRecords] = useState<SptRecord[]>([]);
    const [search, setSearch] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [emailSubject, setEmailSubject] = useState(defaultEmailSubject);
    const [emailBody, setEmailBody] = useState(defaultEmailBody);
    const [whatsappBody, setWhatsappBody] = useState(defaultWhatsappBody);

    useEffect(() => {
        const saved = window.localStorage.getItem("assignmentTemplates");
        if (!saved) return;
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
            const { data } = await axios.get<SptRecord[]>("/api/monthly-spt/my-records");
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

    const updateStatus = async (record: SptRecord, status: TaskStatus) => {
        setUpdatingId(record.id);
        try {
            await axios.patch(`/api/monthly-spt/${record.id}/status`, { status });
            setRecords((prev) =>
                prev.map((r) =>
                    r.id === record.id
                        ? {
                              ...r,
                              status,
                              contacted_at:
                                  status === "contacted" || status === "done"
                                      ? r.contacted_at ?? new Date().toISOString()
                                      : r.contacted_at,
                              done_at:
                                  status === "done"
                                      ? r.done_at ?? new Date().toISOString()
                                      : r.done_at,
                          }
                        : r,
                ),
            );
        } catch {
            // silently ignore — record stays at old status
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredRecords = useMemo(() => {
        if (!search.trim()) return records;
        const normalized = search.trim().toLowerCase();
        return records.filter((record) =>
            [record.npwp, record.taxpayer_name ?? ""]
                .join(" ")
                .toLowerCase()
                .includes(normalized),
        );
    }, [records, search]);

    const groupedAssignments = useMemo(() => {
        const groups: Record<string, SptRecord[]> = {};
        filteredRecords.forEach((record) => {
            const key = `${record.period_year}-${String(record.period_month).padStart(2, "0")}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(record);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredRecords]);

    const totalDone = records.filter((r) => r.status === "done").length;
    const totalPending = records.filter((r) => r.status === "pending").length;

    return (
        <SidebarLayout>
            <div className="p-5">
                <div className="flex justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">My Assignments</h1>
                        <p className="text-sm text-muted-foreground">
                            Track and update your SPT collection tasks by period.
                        </p>
                    </div>
                </div>

                {pageError ? (
                    <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {pageError}
                    </div>
                ) : null}

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="bg-white rounded-md p-5 shadow-sm">
                        <p className="text-sm text-muted-foreground">Total tasks</p>
                        <p className="mt-1 text-3xl font-semibold">{records.length}</p>
                    </div>
                    <div className="bg-white rounded-md p-5 shadow-sm">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="mt-1 text-3xl font-semibold text-yellow-600">{totalPending}</p>
                    </div>
                    <div className="bg-white rounded-md p-5 shadow-sm">
                        <p className="text-sm text-muted-foreground">Done</p>
                        <p className="mt-1 text-3xl font-semibold text-green-600">{totalDone}</p>
                    </div>
                </div>

                <div className="mt-4 bg-white rounded-md p-5 shadow-sm">
                    <Input
                        placeholder="Search by NPWP or company name"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
                </div>

                <div className="mt-6 space-y-8">
                    {groupedAssignments.length === 0 ? (
                        <div className="rounded-md bg-white p-6 shadow-sm">
                            <p className="text-sm text-muted-foreground">
                                No tasks found.
                            </p>
                        </div>
                    ) : (
                        groupedAssignments.map(([periodKey, entries]) => {
                            const [year, month] = periodKey.split("-");
                            const periodDone = entries.filter((e) => e.status === "done").length;

                            return (
                                <section
                                    key={periodKey}
                                    className="bg-white rounded-md p-6 shadow-sm"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold">
                                                {formatMonthLabel(+year, +month)}
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                {periodDone} / {entries.length} done
                                            </p>
                                        </div>
                                    </div>

                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>NPWP</TableHead>
                                                <TableHead>Company</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Contact</TableHead>
                                                <TableHead>Update</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((row) => {
                                                const whatsappNumber = row.whatsapp_number
                                                    ? normalizeWhatsappNumber(row.whatsapp_number)
                                                    : "";
                                                const subject = formatTemplate(emailSubject, row, user.name);
                                                const body = formatTemplate(emailBody, row, user.name);
                                                const whatsappText = formatTemplate(whatsappBody, row, user.name);
                                                const gmailHref = row.email
                                                    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(row.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                                                    : undefined;
                                                const whatsappHref = whatsappNumber
                                                    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`
                                                    : undefined;
                                                const isUpdating = updatingId === row.id;

                                                return (
                                                    <TableRow key={row.id}>
                                                        <TableCell>{row.npwp}</TableCell>
                                                        <TableCell>{row.taxpayer_name ?? "-"}</TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={row.status} />
                                                        </TableCell>
                                                        <TableCell className="space-x-2">
                                                            <Button asChild variant="outline" size="sm">
                                                                <a
                                                                    href={gmailHref ?? "#"}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className={!gmailHref ? "pointer-events-none opacity-50" : undefined}
                                                                >
                                                                    Email
                                                                </a>
                                                            </Button>
                                                            <Button asChild variant="outline" size="sm">
                                                                <a
                                                                    href={whatsappHref ?? "#"}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className={!whatsappHref ? "pointer-events-none opacity-50" : undefined}
                                                                >
                                                                    WhatsApp
                                                                </a>
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="space-x-2">
                                                            {row.status === "pending" && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={isUpdating}
                                                                    onClick={() => updateStatus(row, "contacted")}
                                                                >
                                                                    Mark Contacted
                                                                </Button>
                                                            )}
                                                            {row.status !== "done" && (
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isUpdating}
                                                                    onClick={() => updateStatus(row, "done")}
                                                                >
                                                                    Mark Done
                                                                </Button>
                                                            )}
                                                            {row.status === "done" && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Completed
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                        <TableCaption>
                                            Filtered by your NIP for this period.
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
