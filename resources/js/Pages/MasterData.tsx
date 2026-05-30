import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import Modal from "@/Components/Modal";
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
    DataTablePagination,
    type PaginationMeta,
    type PaginatedResponse,
} from "@/Components/ui/data-table-pagination";
import SidebarLayout from "@/Layouts/SidebarLayout";

interface ImportFileRecord {
    id: number;
    original_name: string;
    status: string;
    created_at: string;
    processed_at: string | null;
}

interface MasterDataRecord {
    id: number;
    npwp: string;
    taxpayer_name: string;
    email: string | null;
    whatsapp_number: string | null;
}

function EditMasterPopover({
    row,
    onSave,
    onDelete,
}: {
    row: MasterDataRecord;
    onSave: (r: MasterDataRecord) => void;
    onDelete: (id: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const [npwp, setNpwp] = useState(row.npwp);
    const [taxpayerName, setTaxpayerName] = useState(row.taxpayer_name);
    const [email, setEmail] = useState(row.email ?? "");
    const [whatsapp, setWhatsapp] = useState(row.whatsapp_number ?? "");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const doSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const { data } = await axios.put(`/api/master-data/records/${row.id}`, {
                npwp,
                taxpayer_name: taxpayerName,
                email: email || null,
                whatsapp_number: whatsapp || null,
            });
            onSave(data);
            setOpen(false);
            toast.success("Master record saved");
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : err instanceof Error ? err.message : "An unexpected error occurred.";
            setError(msg);
            toast.error("Save failed", { description: msg });
        } finally {
            setSaving(false);
            setConfirmSaveOpen(false);
        }
    };

    const doDelete = async () => {
        setDeleting(true);
        setError(null);
        try {
            await axios.delete(`/api/master-data/records/${row.id}`);
            onDelete(row.id);
            setOpen(false);
            toast.success("Master record deleted");
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message ?? "Failed to delete" : "Failed to delete";
            setError(msg);
            toast.error("Delete failed", { description: msg });
        } finally {
            setDeleting(false);
            setConfirmDeleteOpen(false);
        }
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">Edit</Button>
                </PopoverTrigger>
                <PopoverContent side="right" className="w-80">
                    <PopoverHeader>
                        <PopoverTitle>Edit Master Record</PopoverTitle>
                        <PopoverDescription />
                    </PopoverHeader>
                    <div className="space-y-2 pt-2">
                        <label className="text-sm">NPWP</label>
                        <Input value={npwp} onChange={(e) => setNpwp(e.target.value)} />
                        <label className="text-sm">Taxpayer Name</label>
                        <Input value={taxpayerName} onChange={(e) => setTaxpayerName(e.target.value)} />
                        <label className="text-sm">Email</label>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                        <label className="text-sm">WhatsApp</label>
                        <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                        {error ? <p className="text-sm text-destructive">{error}</p> : null}
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => setConfirmSaveOpen(true)} disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>Delete</Button>
                            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Modal show={confirmSaveOpen} onClose={() => setConfirmSaveOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h3 className="text-lg font-medium">Confirm save</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Are you sure you want to save changes?</p>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setConfirmSaveOpen(false)}>Cancel</Button>
                        <Button onClick={doSave} disabled={saving}>{saving ? "Saving..." : "Confirm"}</Button>
                    </div>
                </div>
            </Modal>

            <Modal show={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <h3 className="text-lg font-medium">Confirm delete</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This will permanently delete the master record. If it is still assigned to AR data the deletion will be rejected.
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={doDelete} disabled={deleting}>
                            {deleting ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default function MasterData() {
    const [imports, setImports] = useState<ImportFileRecord[]>([]);
    const [masterData, setMasterData] = useState<MasterDataRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [fetchKey, setFetchKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            setDebouncedSearch(search);
        }, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [search]);

    const getErrorMessage = (error: unknown) => {
        if (axios.isAxiosError(error)) {
            return error.response?.data?.message ?? error.response?.data?.error ?? error.response?.statusText ?? error.message ?? "An unexpected error occurred.";
        }
        return error instanceof Error ? error.message : "An unexpected error occurred.";
    };

    const fetchImports = async () => {
        try {
            const { data } = await axios.get<ImportFileRecord[]>("/api/master-data/imports");
            setImports(data);
            setPageError(null);
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    };

    const fetchMasterData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get<PaginatedResponse<MasterDataRecord>>("/api/master-data/records", {
                params: {
                    page,
                    per_page: perPage,
                    search: debouncedSearch || undefined,
                },
            });
            setMasterData(data.data);
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
    }, [page, perPage, debouncedSearch, fetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchImports();
        fetchMasterData();
        const interval = window.setInterval(fetchImports, 10000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    const handlePerPageChange = (val: number) => {
        setPage(1);
        setPerPage(val);
    };

    const handleUpload = async () => {
        if (!selectedFile) { setUploadError("Please select a file."); return; }
        const formData = new FormData();
        formData.append("file", selectedFile);
        setUploading(true);
        setUploadError(null);
        try {
            const response = await axios.post("/api/master-data/import/upload", formData);
            await axios.post(`/api/master-data/import/${response.data.id}/process`);
            await fetchImports();
            setFetchKey((k) => k + 1);
            setSelectedFile(null);
            setIsPopoverOpen(false);
        } catch (error) {
            const message = getErrorMessage(error);
            setUploadError(message);
            setPageError(message);
        } finally {
            setUploading(false);
        }
    };

    const handleProcess = async (importFileId: number) => {
        try {
            await axios.post(`/api/master-data/import/${importFileId}/process`);
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
                        <h1 className="text-2xl">Master data</h1>
                        <p className="text-sm text-muted-foreground">NPWP taxpayer master records.</p>
                    </div>
                </div>

                {pageError ? (
                    <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{pageError}</div>
                ) : null}

                <div className="mt-10 p-7 bg-white rounded-md shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h4 className="text-lg font-medium">Total Wajib Pajak</h4>
                            <p className="mt-1 text-3xl font-semibold">
                                {pagination ? pagination.total.toLocaleString() : "—"}
                            </p>
                        </div>
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="secondary" className="bg-blue-600 text-white">Upload Excel</Button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" className="w-80">
                                <PopoverHeader>
                                    <PopoverTitle>Upload Master Data</PopoverTitle>
                                    <PopoverDescription>Upload an Excel or CSV file to import NPWP master data.</PopoverDescription>
                                </PopoverHeader>
                                <div className="space-y-3 pt-2">
                                    <label className="block text-sm font-medium text-foreground">File</label>
                                    <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setUploadError(null); }} />
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
                    <section className="bg-white rounded-md p-6 shadow-sm">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold">Uploaded Excel Files</h2>
                            <p className="text-sm text-muted-foreground">Recent master data uploads and import status.</p>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Uploaded at</TableHead>
                                    <TableHead>Processed at</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {imports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No uploaded files yet.</TableCell>
                                    </TableRow>
                                ) : imports.map((f) => (
                                    <TableRow key={f.id}>
                                        <TableCell>{f.original_name}</TableCell>
                                        <TableCell>
                                            <span className="rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground bg-muted/70">{f.status}</span>
                                        </TableCell>
                                        <TableCell>{new Date(f.created_at).toLocaleString()}</TableCell>
                                        <TableCell>{f.processed_at ? new Date(f.processed_at).toLocaleString() : "-"}</TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => handleProcess(f.id)} disabled={f.status === "processing"}>
                                                {f.status === "processing" ? "Processing" : "Process"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </section>

                    <section className="bg-white rounded-md p-6 shadow-sm">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Imported Master Data</h2>
                                <p className="text-sm text-muted-foreground">Imported records from the latest Excel uploads.</p>
                            </div>
                            <Input
                                placeholder="Search NPWP or taxpayer name"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-56"
                            />
                        </div>
                        <div className={loading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>NPWP</TableHead>
                                        <TableHead>Taxpayer</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>WhatsApp</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {masterData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                                                {debouncedSearch ? "No records match your search." : "No master data imported yet."}
                                            </TableCell>
                                        </TableRow>
                                    ) : masterData.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.npwp}</TableCell>
                                            <TableCell>{row.taxpayer_name}</TableCell>
                                            <TableCell>{row.email ?? "-"}</TableCell>
                                            <TableCell>{row.whatsapp_number ?? "-"}</TableCell>
                                            <TableCell>
                                                <EditMasterPopover
                                                    row={row}
                                                    onSave={(updated) => setMasterData((prev) => prev.map((r) => r.id === updated.id ? updated : r))}
                                                    onDelete={() => setFetchKey((k) => k + 1)}
                                                />
                                            </TableCell>
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
