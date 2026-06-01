import { Fragment, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ImportInvalidRows } from "@/Components/ImportInvalidRows";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { toast } from "sonner";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
    PopoverDescription,
} from "@/Components/ui/popover";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/Components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";
import {
    DataTablePagination,
    type PaginationMeta,
    type PaginatedResponse,
} from "@/Components/ui/data-table-pagination";
import SidebarLayout from "@/Layouts/SidebarLayout";

type TaskStatus = "pending" | "contacted" | "done";

interface ImportRecord {
    id: number;
    original_filename: string;
    period_month: number;
    period_year: number;
    status: string;
    imported_rows: number;
    invalid_rows: number;
    created_at: string;
    processed_at: string | null;
}

interface SptRecord {
    id: number;
    npwp: string;
    taxpayer_name: string | null;
    nip: string;
    period_month: number;
    period_year: number;
    status: TaskStatus;
    contacted_at: string | null;
    done_at: string | null;
}

const STATUS_CLASS: Record<TaskStatus, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    contacted: "bg-blue-100 text-blue-800",
    done: "bg-green-100 text-green-800",
};

function StatusBadge({ status }: { status: TaskStatus }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ?? error.response?.statusText ?? error.message;
    }
    return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function MonthlySpt() {
    const [imports, setImports] = useState<ImportRecord[]>([]);
    const [expandedImportId, setExpandedImportId] = useState<number | null>(null);
    const [records, setRecords] = useState<SptRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [periodMonth, setPeriodMonth] = useState(String(new Date().getMonth() + 1));
    const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()));
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    // Debounce search — batch both the page reset and the search commit so only one fetch fires
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            setDebouncedSearch(search);
        }, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [search]);

    const fetchImports = async () => {
        try {
            const { data } = await axios.get<ImportRecord[]>("/api/monthly-spt/imports");
            setImports(data);
            setPageError(null);
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    };

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get<PaginatedResponse<SptRecord>>("/api/monthly-spt/records", {
                params: {
                    page,
                    per_page: perPage,
                    search: debouncedSearch || undefined,
                    status: statusFilter !== "all" ? statusFilter : undefined,
                },
            });
            setRecords(data.data);
            setPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                per_page: data.per_page,
                total: data.total,
                from: data.from,
                to: data.to,
            });
            setPageError(null);
        } catch (error) {
            setPageError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [page, perPage, debouncedSearch, statusFilter]);

    useEffect(() => {
        fetchImports();
        const interval = window.setInterval(fetchImports, 10000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleStatusFilterChange = (val: string) => {
        setPage(1);
        setStatusFilter(val as TaskStatus | "all");
    };

    const handlePerPageChange = (val: number) => {
        setPage(1);
        setPerPage(val);
    };

    const handleUpload = async () => {
        if (!selectedFile) { setUploadError("Please select a file."); return; }
        const month = parseInt(periodMonth, 10);
        const year = parseInt(periodYear, 10);
        if (!month || month < 1 || month > 12) { setUploadError("Month must be between 1 and 12."); return; }
        if (!year || year < 2000) { setUploadError("Year must be 2000 or later."); return; }

        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("period_month", String(month));
        formData.append("period_year", String(year));

        setUploading(true);
        setUploadError(null);

        try {
            const { data } = await axios.post("/api/monthly-spt/upload", formData);
            await axios.post(`/api/monthly-spt/${data.id}/process`);
            toast.success("File uploaded", {
                description: `Processing started for ${year}-${String(month).padStart(2, "0")}.`,
            });
            setSelectedFile(null);
            setIsPopoverOpen(false);
            await fetchImports();
            await fetchRecords();
        } catch (error) {
            const msg = getErrorMessage(error);
            setUploadError(msg);
            toast.error("Upload failed", { description: msg });
        } finally {
            setUploading(false);
        }
    };

    const handleProcess = async (importId: number) => {
        try {
            await axios.post(`/api/monthly-spt/${importId}/process`);
            await fetchImports();
            setPageError(null);
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    };

    return (
        <SidebarLayout>
            <div className="p-5">
                <div className="flex justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">Monthly SPT</h1>
                        <p className="text-sm text-muted-foreground">
                            Upload and monitor monthly SPT collection tasks.
                        </p>
                    </div>
                </div>

                {pageError ? (
                    <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {pageError}
                    </div>
                ) : null}

                <div className="mt-10 p-7 bg-white rounded-md shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h4 className="text-lg font-medium">Total SPT tasks</h4>
                            <p className="mt-1 text-3xl font-semibold">
                                {pagination ? pagination.total.toLocaleString() : "—"}
                            </p>
                        </div>
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="secondary" className="bg-blue-600 text-white">
                                    Upload Excel
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" className="w-80">
                                <PopoverHeader>
                                    <PopoverTitle>Upload Monthly SPT</PopoverTitle>
                                    <PopoverDescription>
                                        Excel columns required: <strong>nip</strong>, <strong>npwp</strong>
                                    </PopoverDescription>
                                </PopoverHeader>
                                <div className="space-y-3 pt-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Month</label>
                                            <Input type="number" min={1} max={12} value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)} placeholder="1–12" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Year</label>
                                            <Input type="number" min={2000} value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} placeholder="2025" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">File</label>
                                        <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setUploadError(null); }} />
                                    </div>
                                    {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
                                    <Button className="w-full" onClick={handleUpload} disabled={uploading}>
                                        {uploading ? "Uploading..." : "Upload & Process"}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="mt-10 space-y-8">
                    {/* Upload history */}
                    <section className="bg-white rounded-md p-6 shadow-sm">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold">Uploaded Excel Files</h2>
                            <p className="text-sm text-muted-foreground">Recent Monthly SPT uploads and import status.</p>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File name</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Imported</TableHead>
                                    <TableHead>Invalid</TableHead>
                                    <TableHead>Uploaded at</TableHead>
                                    <TableHead>Processed at</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {imports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                                            No uploaded files yet.
                                        </TableCell>
                                    </TableRow>
                                ) : imports.map((imp) => (
                                    <Fragment key={imp.id}>
                                        <TableRow>
                                            <TableCell className="max-w-[180px] truncate">{imp.original_filename}</TableCell>
                                            <TableCell>{imp.period_year}-{String(imp.period_month).padStart(2, "0")}</TableCell>
                                            <TableCell>
                                                <span className="rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground bg-muted/70">
                                                    {imp.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>{imp.imported_rows}</TableCell>
                                            <TableCell>
                                                {imp.invalid_rows > 0 ? (
                                                    <button
                                                        type="button"
                                                        className="font-medium text-destructive underline-offset-2 hover:underline"
                                                        onClick={() => setExpandedImportId((id) => (id === imp.id ? null : imp.id))}
                                                    >
                                                        {imp.invalid_rows} {expandedImportId === imp.id ? "▲" : "▼"}
                                                    </button>
                                                ) : (
                                                    imp.invalid_rows
                                                )}
                                            </TableCell>
                                            <TableCell>{new Date(imp.created_at).toLocaleString()}</TableCell>
                                            <TableCell>{imp.processed_at ? new Date(imp.processed_at).toLocaleString() : "-"}</TableCell>
                                            <TableCell>
                                                <Button variant="outline" size="sm" onClick={() => handleProcess(imp.id)} disabled={imp.status === "processing"}>
                                                    {imp.status === "processing" ? "Processing" : "Re-process"}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {expandedImportId === imp.id && imp.invalid_rows > 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="p-0">
                                                    <ImportInvalidRows endpoint={`/api/monthly-spt/${imp.id}/invalid-rows`} />
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                    </Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </section>

                    {/* SPT records */}
                    <section className="bg-white rounded-md p-6 shadow-sm">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Imported SPT Data</h2>
                                <p className="text-sm text-muted-foreground">All SPT tasks with collection status.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Input
                                    placeholder="Search NPWP, company or NIP"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-56"
                                />
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
                        </div>
                        <div className={loading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>NPWP</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>AR NIP</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Contacted at</TableHead>
                                        <TableHead>Done at</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                                                {debouncedSearch || statusFilter !== "all"
                                                    ? "No records match the current filter."
                                                    : "No SPT records imported yet."}
                                            </TableCell>
                                        </TableRow>
                                    ) : records.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.npwp}</TableCell>
                                            <TableCell>{row.taxpayer_name ?? "-"}</TableCell>
                                            <TableCell>{row.nip}</TableCell>
                                            <TableCell>{row.period_year}-{String(row.period_month).padStart(2, "0")}</TableCell>
                                            <TableCell><StatusBadge status={row.status} /></TableCell>
                                            <TableCell>{row.contacted_at ? new Date(row.contacted_at).toLocaleString() : "-"}</TableCell>
                                            <TableCell>{row.done_at ? new Date(row.done_at).toLocaleString() : "-"}</TableCell>
                                        </TableRow>
                                    ))}
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
                    </section>
                </div>
            </div>
        </SidebarLayout>
    );
}
