import { useCallback, useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import axios from "axios";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/Components/ui/table";
import {
    DataTablePagination,
    type PaginationMeta,
} from "@/Components/ui/data-table-pagination";
import SidebarLayout from "@/Layouts/SidebarLayout";
import { SPT_TYPES, sptTypeLabel } from "@/lib/sptTypes";

type TaskStatus = "pending" | "contacted" | "done";

interface Period {
    period_year: number;
    period_month: number;
}

interface SptRecord {
    id: number;
    npwp: string;
    taxpayer_name: string | null;
    email: string | null;
    whatsapp_number: string | null;
    period_year: number;
    period_month: number;
    spt_type: string | null;
    status: TaskStatus;
    contacted_at: string | null;
    done_at: string | null;
    notes: string | null;
}

interface MyRecordsResponse {
    data: SptRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    stats: { total: number; pending: number; done: number };
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
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
            {STATUS_LABEL[status]}
        </span>
    );
}

function periodKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, "0")}`;
}

function parsePeriodKey(key: string): { year: number; month: number } {
    const [y, m] = key.split("-");
    return { year: Number(y), month: Number(m) };
}

function formatPeriodLabel(year: number, month: number) {
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

const defaultEmailSubject = "Pengingat SPT Masa {{spt_type}} {{period}}";
const defaultEmailBody = `Yth. Bapak/Ibu Pimpinan {{company}},\n\nBerdasarkan pantauan sistem kami, Anda belum melakukan pelaporan SPT Masa {{spt_type}} untuk bulan {{period}} yang telah melewati jatuh tempo.\n\nMohon segera laporkan kewajiban perpajakan Anda (NPWP: {{npwp}}) sesegera mungkin.\n\nJika ada kendala, silakan hubungi kami.\n\nSalam,\n{{ar_name}} - Account Representative Anda`;
const defaultWhatsappBody = `Yth. Bapak/Ibu Pimpinan {{company}},\n\nMohon segera menindaklanjuti pelaporan SPT Masa {{spt_type}} untuk bulan {{period}} (NPWP: {{npwp}}). Jika butuh bantuan, silakan hubungi saya.\n\nTerima kasih.\n{{ar_name}}`;

function formatTemplate(template: string, row: SptRecord, arName: string) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, token) => {
        switch (token) {
            case "company":  return row.taxpayer_name ?? row.npwp;
            case "npwp":     return row.npwp;
            case "period":   return formatPeriodLabel(row.period_year, row.period_month);
            case "spt_type": return sptTypeLabel(row.spt_type);
            case "ar_name":  return arName;
            default:         return "";
        }
    });
}

export default function MyAssignments() {
    const inertiaPage = usePage();
    const user = (
        (inertiaPage.props as any)?.auth as { user?: { name: string } } | undefined
    )?.user ?? { name: "Account Representative Anda" };

    // Period list
    const [periods, setPeriods] = useState<Period[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>("");
    const [periodsLoading, setPeriodsLoading] = useState(true);

    // Table state
    const [records, setRecords] = useState<SptRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, done: 0 });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
    const [sptTypeFilter, setSptTypeFilter] = useState<string>("all");
    const [fetchKey, setFetchKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    // Message templates
    const [emailSubject, setEmailSubject] = useState(defaultEmailSubject);
    const [emailBody, setEmailBody] = useState(defaultEmailBody);
    const [whatsappBody, setWhatsappBody] = useState(defaultWhatsappBody);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get("/api/assignment-templates");
                setEmailSubject(data.email_subject ?? defaultEmailSubject);
                setEmailBody(data.email_body ?? defaultEmailBody);
                setWhatsappBody(data.whatsapp_body ?? defaultWhatsappBody);
            } catch { /* fall back to defaults */ }
        })();
    }, []);

    // 1. Fetch available periods on mount
    useEffect(() => {
        (async () => {
            setPeriodsLoading(true);
            try {
                const { data } = await axios.get<Period[]>("/api/monthly-spt/my-periods");
                setPeriods(data);
                if (data.length > 0) {
                    setSelectedPeriod(periodKey(data[0].period_year, data[0].period_month));
                }
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    setPageError(error.response?.data?.message ?? error.message);
                }
            } finally {
                setPeriodsLoading(false);
            }
        })();
    }, []);

    // Debounce search — batch page reset + commit
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            setDebouncedSearch(search);
        }, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [search]);

    // 2. Fetch records whenever period / filters / page change
    const fetchRecords = useCallback(async () => {
        if (!selectedPeriod) return;

        const { year, month } = parsePeriodKey(selectedPeriod);
        setLoading(true);
        try {
            const { data } = await axios.get<MyRecordsResponse>("/api/monthly-spt/my-records", {
                params: {
                    period_year:  year,
                    period_month: month,
                    page,
                    per_page:     perPage,
                    search:       debouncedSearch || undefined,
                    status:       statusFilter !== "all" ? statusFilter : undefined,
                    spt_type:     sptTypeFilter !== "all" ? sptTypeFilter : undefined,
                },
            });
            setRecords(data.data);
            setPagination({
                current_page: data.current_page,
                last_page:    data.last_page,
                per_page:     data.per_page,
                total:        data.total,
                from:         data.from,
                to:           data.to,
            });
            setStats(data.stats);
            setPageError(null);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                setPageError(error.response?.data?.message ?? error.message);
            } else if (error instanceof Error) {
                setPageError(error.message);
            } else {
                setPageError("Unable to load assignments.");
            }
        } finally {
            setLoading(false);
        }
    }, [selectedPeriod, page, perPage, debouncedSearch, statusFilter, sptTypeFilter, fetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Period change resets all filters
    const handlePeriodChange = (val: string) => {
        setPage(1);
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter("all");
        setSptTypeFilter("all");
        setSelectedPeriod(val);
    };

    const handleStatusFilterChange = (val: string) => {
        setPage(1);
        setStatusFilter(val as TaskStatus | "all");
    };

    const handleSptTypeFilterChange = (val: string) => {
        setPage(1);
        setSptTypeFilter(val);
    };

    const handlePerPageChange = (val: number) => {
        setPage(1);
        setPerPage(val);
    };

    const updateStatus = async (record: SptRecord, status: TaskStatus) => {
        setUpdatingId(record.id);
        try {
            await axios.patch(`/api/monthly-spt/${record.id}/status`, { status });
            // Optimistic UI update
            setRecords((prev) =>
                prev.map((r) =>
                    r.id === record.id
                        ? {
                              ...r,
                              status,
                              contacted_at: (status === "contacted" || status === "done")
                                  ? (r.contacted_at ?? new Date().toISOString())
                                  : r.contacted_at,
                              done_at: status === "done"
                                  ? (r.done_at ?? new Date().toISOString())
                                  : r.done_at,
                          }
                        : r,
                ),
            );
            // Refresh stats in background
            setFetchKey((k) => k + 1);
        } catch {
            // silently ignore — record stays at old status
        } finally {
            setUpdatingId(null);
        }
    };

    const selectedPeriodLabel = selectedPeriod
        ? formatPeriodLabel(parsePeriodKey(selectedPeriod).year, parsePeriodKey(selectedPeriod).month)
        : "";

    return (
        <SidebarLayout>
            <div className="p-5">
                {/* Header */}
                <div className="flex justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">My Assignments</h1>
                        <p className="text-sm text-muted-foreground">
                            Track and update your SPT collection tasks.
                        </p>
                    </div>
                </div>

                {pageError ? (
                    <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {pageError}
                    </div>
                ) : null}

                {/* Empty state — no assignments at all */}
                {!periodsLoading && periods.length === 0 ? (
                    <div className="mt-10 bg-white rounded-md p-10 shadow-sm text-center">
                        <p className="text-muted-foreground">You have no assignments yet.</p>
                    </div>
                ) : (
                    <>
                        {/* Period selector */}
                        <div className="mt-6 bg-white rounded-md p-5 shadow-sm flex flex-wrap items-center gap-4">
                            <span className="text-sm font-medium text-muted-foreground">Period</span>
                            <Select
                                value={selectedPeriod}
                                onValueChange={handlePeriodChange}
                                disabled={periodsLoading}
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder={periodsLoading ? "Loading…" : "Select period"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods.map((p) => (
                                        <SelectItem
                                            key={periodKey(p.period_year, p.period_month)}
                                            value={periodKey(p.period_year, p.period_month)}
                                        >
                                            {formatPeriodLabel(p.period_year, p.period_month)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedPeriodLabel && (
                                <span className="text-sm text-muted-foreground">
                                    {periods.length} period{periods.length !== 1 ? "s" : ""} available
                                </span>
                            )}
                        </div>

                        {/* Stats for selected period */}
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="bg-white rounded-md p-5 shadow-sm">
                                <p className="text-sm text-muted-foreground">Total tasks</p>
                                <p className="mt-1 text-3xl font-semibold">{stats.total.toLocaleString()}</p>
                            </div>
                            <div className="bg-white rounded-md p-5 shadow-sm">
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="mt-1 text-3xl font-semibold text-yellow-600">{stats.pending.toLocaleString()}</p>
                            </div>
                            <div className="bg-white rounded-md p-5 shadow-sm">
                                <p className="text-sm text-muted-foreground">Done</p>
                                <p className="mt-1 text-3xl font-semibold text-green-600">{stats.done.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Records table */}
                        <div className="mt-4 bg-white rounded-md p-6 shadow-sm">
                            {/* Filter bar */}
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <Input
                                    placeholder="Search NPWP or company name"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Select value={sptTypeFilter} onValueChange={handleSptTypeFilterChange}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All SPT types</SelectItem>
                                        {SPT_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                    <SelectTrigger className="w-36">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="contacted">Contacted</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className={loading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>NPWP</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>SPT type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Update</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {records.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                                                    {debouncedSearch || statusFilter !== "all" || sptTypeFilter !== "all"
                                                        ? "No tasks match the current filter."
                                                        : "No tasks for this period."}
                                                </TableCell>
                                            </TableRow>
                                        ) : records.map((row) => {
                                            const whatsappNumber = row.whatsapp_number
                                                ? normalizeWhatsappNumber(row.whatsapp_number)
                                                : "";
                                            const subject      = formatTemplate(emailSubject, row, user.name);
                                            const body         = formatTemplate(emailBody, row, user.name);
                                            const whatsappText = formatTemplate(whatsappBody, row, user.name);
                                            const gmailHref    = row.email
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
                                                    <TableCell>{sptTypeLabel(row.spt_type)}</TableCell>
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
                                                            <span className="text-xs text-muted-foreground">Completed</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {pagination && (
                                <DataTablePagination
                                    meta={pagination}
                                    onPageChange={setPage}
                                    onPerPageChange={handlePerPageChange}
                                    loading={loading}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </SidebarLayout>
    );
}
