import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
    TableCaption,
} from "@/Components/ui/table";
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
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
        >
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return (
            error.response?.data?.message ??
            error.response?.statusText ??
            error.message
        );
    }
    return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function MonthlySpt() {
    const [imports, setImports] = useState<ImportRecord[]>([]);
    const [records, setRecords] = useState<SptRecord[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [periodMonth, setPeriodMonth] = useState(String(new Date().getMonth() + 1));
    const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()));
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

    const fetchImports = async () => {
        try {
            const { data } = await axios.get<ImportRecord[]>("/api/monthly-spt/imports");
            setImports(data);
            setPageError(null);
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    };

    const fetchRecords = async () => {
        try {
            const { data } = await axios.get<SptRecord[]>("/api/monthly-spt/records");
            setRecords(data);
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    };

    useEffect(() => {
        fetchImports();
        fetchRecords();
        const interval = window.setInterval(fetchImports, 10000);
        return () => window.clearInterval(interval);
    }, []);

    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadError("Please select a file.");
            return;
        }
        const month = parseInt(periodMonth, 10);
        const year = parseInt(periodYear, 10);
        if (!month || month < 1 || month > 12) {
            setUploadError("Month must be between 1 and 12.");
            return;
        }
        if (!year || year < 2000) {
            setUploadError("Year must be 2000 or later.");
            return;
        }

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

    const filteredRecords = useMemo(() => {
        return records.filter((r) => {
            const matchesSearch =
                !search.trim() ||
                [r.npwp, r.taxpayer_name ?? "", r.nip]
                    .join(" ")
                    .toLowerCase()
                    .includes(search.trim().toLowerCase());
            const matchesStatus = statusFilter === "all" || r.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [records, search, statusFilter]);

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
                            <p className="mt-1 text-3xl font-semibold">{records.length}</p>
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
                                            <Input
                                                type="number"
                                                min={1}
                                                max={12}
                                                value={periodMonth}
                                                onChange={(e) => setPeriodMonth(e.target.value)}
                                                placeholder="1–12"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Year</label>
                                            <Input
                                                type="number"
                                                min={2000}
                                                value={periodYear}
                                                onChange={(e) => setPeriodYear(e.target.value)}
                                                placeholder="2025"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">File</label>
                                        <Input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={(e) => {
                                                setSelectedFile(e.target.files?.[0] ?? null);
                                                setUploadError(null);
                                            }}
                                        />
                                    </div>
                                    {uploadError ? (
                                        <p className="text-sm text-destructive">{uploadError}</p>
                                    ) : null}
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
                            <p className="text-sm text-muted-foreground">
                                Recent Monthly SPT uploads and import status.
                            </p>
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
                                {imports.map((imp) => (
                                    <TableRow key={imp.id}>
                                        <TableCell className="max-w-[180px] truncate">
                                            {imp.original_filename}
                                        </TableCell>
                                        <TableCell>
                                            {imp.period_year}-{String(imp.period_month).padStart(2, "0")}
                                        </TableCell>
                                        <TableCell>
                                            <span className="rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground bg-muted/70">
                                                {imp.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>{imp.imported_rows}</TableCell>
                                        <TableCell>{imp.invalid_rows}</TableCell>
                                        <TableCell>
                                            {new Date(imp.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {imp.processed_at
                                                ? new Date(imp.processed_at).toLocaleString()
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleProcess(imp.id)}
                                                disabled={imp.status === "processing"}
                                            >
                                                {imp.status === "processing" ? "Processing" : "Re-process"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableCaption>
                                {imports.length === 0
                                    ? "No uploaded files yet."
                                    : `${imports.length} files uploaded.`}
                            </TableCaption>
                        </Table>
                    </section>

                    {/* SPT records */}
                    <section className="bg-white rounded-md p-6 shadow-sm">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Imported SPT Data</h2>
                                <p className="text-sm text-muted-foreground">
                                    All SPT tasks with collection status.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Input
                                    placeholder="Search NPWP, company or NIP"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-56"
                                />
                                <select
                                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value as TaskStatus | "all")
                                    }
                                >
                                    <option value="all">All statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="done">Done</option>
                                </select>
                            </div>
                        </div>
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
                                {filteredRecords.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.npwp}</TableCell>
                                        <TableCell>{row.taxpayer_name ?? "-"}</TableCell>
                                        <TableCell>{row.nip}</TableCell>
                                        <TableCell>
                                            {row.period_year}-{String(row.period_month).padStart(2, "0")}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={row.status} />
                                        </TableCell>
                                        <TableCell>
                                            {row.contacted_at
                                                ? new Date(row.contacted_at).toLocaleString()
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {row.done_at
                                                ? new Date(row.done_at).toLocaleString()
                                                : "-"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableCaption>
                                {filteredRecords.length === 0
                                    ? "No records match the current filter."
                                    : `Showing ${filteredRecords.length} of ${records.length} tasks.`}
                            </TableCaption>
                        </Table>
                    </section>
                </div>
            </div>
        </SidebarLayout>
    );
}
