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

interface ARDataRecord {
    id: number;
    nip: string;
    username: string;
    email?: string | null;
    password?: string | null;
}

function EditARPopover({
    row,
    onSave,
    onDelete,
}: {
    row: ARDataRecord;
    onSave: (r: ARDataRecord) => void;
    onDelete: (id: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const [nip, setNip] = useState(row.nip);
    const [username, setUsername] = useState(row.username);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const doSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const { data } = await axios.put(`/api/import-ar/records/${row.id}`, { nip, username });
            onSave(data);
            setOpen(false);
            toast.success("AR record saved");
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.message ?? err.message)
                : err instanceof Error ? err.message : "An unexpected error occurred.";
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
            await axios.delete(`/api/import-ar/records/${row.id}`);
            onDelete(row.id);
            setOpen(false);
            toast.success("AR record deleted");
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : "Failed to delete";
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
                <PopoverContent side="right" className="w-72">
                    <PopoverHeader>
                        <PopoverTitle>Edit AR Record</PopoverTitle>
                        <PopoverDescription />
                    </PopoverHeader>
                    <div className="space-y-2 pt-2">
                        <label className="text-sm">NIP</label>
                        <Input value={nip} onChange={(e) => setNip(e.target.value)} />
                        <label className="text-sm">Username</label>
                        <Input value={username} onChange={(e) => setUsername(e.target.value)} />
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
                    <p className="mt-2 text-sm text-muted-foreground">This will permanently delete the AR record. Continue?</p>
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

export default function ARData() {
    const [imports, setImports] = useState<ImportFileRecord[]>([]);
    const [arData, setArData] = useState<ARDataRecord[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [fetchKey, setFetchKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newNip, setNewNip] = useState("");
    const [newUsername, setNewUsername] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [creating, setCreating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
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
            const { data } = await axios.get<ImportFileRecord[]>("/api/import-ar/imports");
            setImports(data);
            setPageError(null);
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    };

    const fetchArData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get<PaginatedResponse<ARDataRecord>>("/api/import-ar/records", {
                params: {
                    page,
                    per_page: perPage,
                    search: debouncedSearch || undefined,
                },
            });
            setArData(data.data);
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
        fetchArData();
        const interval = window.setInterval(fetchImports, 10000);
        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchArData();
    }, [fetchArData]);

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
            const response = await axios.post("/api/import-ar/upload", formData);
            await axios.post(`/api/import-ar/${response.data.id}/process`);
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
            await axios.post(`/api/import-ar/${importFileId}/process`);
            await fetchImports();
            setPageError(null);
        } catch (error) {
            setPageError(getErrorMessage(error));
        }
    };

    const handleCreate = async () => {
        setCreating(true);
        setCreateError(null);
        try {
            await axios.post("/api/import-ar/records", {
                nip: newNip,
                username: newUsername,
                email: newEmail || null,
                password: newPassword || null,
            });
            setNewNip(""); setNewUsername(""); setNewEmail(""); setNewPassword("");
            setIsCreateModalOpen(false);
            setPage(1);
            setFetchKey((k) => k + 1);
            toast.success("AR record added");
        } catch (error) {
            const message = getErrorMessage(error);
            setCreateError(message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <SidebarLayout>
            <div className="p-5">
                <div className="flex justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">AR data</h1>
                        <p className="text-sm text-muted-foreground">Account Representative records.</p>
                    </div>
                </div>

                <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="md">
                    <div className="p-6 space-y-4">
                        <h3 className="text-lg font-medium">Add AR record</h3>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div><label className="text-sm">NIP</label><Input value={newNip} onChange={(e) => setNewNip(e.target.value)} /></div>
                            <div><label className="text-sm">Username</label><Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} /></div>
                            <div><label className="text-sm">Email</label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
                            <div><label className="text-sm">Password</label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
                        </div>
                        {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={creating}>{creating ? "Adding..." : "Add record"}</Button>
                        </div>
                    </div>
                </Modal>

                {pageError ? (
                    <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{pageError}</div>
                ) : null}

                <div className="mt-10 p-7 bg-white rounded-md shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h4 className="text-lg font-medium">Total AR Data</h4>
                            <p className="mt-1 text-3xl font-semibold">
                                {pagination ? pagination.total.toLocaleString() : "—"}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setIsCreateModalOpen(true)}>Add record</Button>
                            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="secondary" className="bg-blue-600 text-white">Upload Excel</Button>
                                </PopoverTrigger>
                                <PopoverContent side="bottom" className="w-80">
                                    <PopoverHeader>
                                        <PopoverTitle>Upload AR Data</PopoverTitle>
                                        <PopoverDescription>Upload an Excel or CSV file to import AR data.</PopoverDescription>
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
                </div>

                <div className="mt-10 space-y-8">
                    <section className="bg-white rounded-md p-6 shadow-sm">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold">Uploaded Excel Files</h2>
                            <p className="text-sm text-muted-foreground">Recent AR uploads and import status.</p>
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
                                <h2 className="text-lg font-semibold">Imported AR Data</h2>
                                <p className="text-sm text-muted-foreground">Imported AR records from the latest Excel uploads.</p>
                            </div>
                            <Input
                                placeholder="Search NIP or username"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-56"
                            />
                        </div>
                        <div className={loading ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>NIP</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Password</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {arData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                                                {debouncedSearch ? "No records match your search." : "No AR data imported yet."}
                                            </TableCell>
                                        </TableRow>
                                    ) : arData.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{row.nip}</TableCell>
                                            <TableCell>{row.username}</TableCell>
                                            <TableCell>{row.email || "-"}</TableCell>
                                            <TableCell>{row.password ? "••••••" : "-"}</TableCell>
                                            <TableCell>
                                                <EditARPopover
                                                    row={row}
                                                    onSave={(updated) => setArData((prev) => prev.map((r) => r.id === updated.id ? updated : r))}
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
