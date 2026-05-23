import { useEffect, useState } from "react";
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
    TableCaption,
} from "@/Components/ui/table";
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
            const { data } = await axios.put(
                `/api/import-ar/records/${row.id}`,
                {
                    nip,
                    username,
                },
            );
            onSave(data);
            setOpen(false);
            toast.success("AR record saved", {
                description: "Changes to the AR record have been saved.",
            });
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.message ?? err.message)
                : err instanceof Error
                  ? err.message
                  : "An unexpected error occurred.";
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
            toast.success("AR record deleted", {
                description: "The AR record has been removed.",
            });
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.message ?? err.message)
                : "Failed to delete";
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
                    <Button size="sm" variant="outline">
                        Edit
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="right" className="w-72">
                    <PopoverHeader>
                        <PopoverTitle>Edit AR Record</PopoverTitle>
                        <PopoverDescription />
                    </PopoverHeader>
                    <div className="space-y-2 pt-2">
                        <label className="text-sm">NIP</label>
                        <Input
                            value={nip}
                            onChange={(e) => setNip(e.target.value)}
                        />
                        <label className="text-sm">Username</label>
                        <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        {error ? (
                            <p className="text-sm text-destructive">{error}</p>
                        ) : null}
                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                onClick={() => setConfirmSaveOpen(true)}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setConfirmDeleteOpen(true)}
                            >
                                Delete
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Modal
                show={confirmSaveOpen}
                onClose={() => setConfirmSaveOpen(false)}
                maxWidth="sm"
            >
                <div className="p-6">
                    <h3 className="text-lg font-medium">Confirm save</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Are you sure you want to save changes?
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmSaveOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={doSave} disabled={saving}>
                            {saving ? "Saving..." : "Confirm"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                show={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                maxWidth="sm"
            >
                <div className="p-6">
                    <h3 className="text-lg font-medium">Confirm delete</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This will permanently delete the AR record. Continue?
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmDeleteOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={doDelete}
                            disabled={deleting}
                        >
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    const getErrorMessage = (error: unknown) => {
        if (axios.isAxiosError(error)) {
            return (
                error.response?.data?.message ??
                error.response?.data?.error ??
                error.response?.statusText ??
                error.message ??
                "An unexpected error occurred."
            );
        }

        return error instanceof Error
            ? error.message
            : "An unexpected error occurred.";
    };

    const fetchImports = async () => {
        try {
            const { data } = await axios.get<ImportFileRecord[]>(
                "/api/import-ar/imports",
            );
            setImports(data);
            setPageError(null);
        } catch (error: unknown) {
            setPageError(getErrorMessage(error));
        }
    };

    const fetchArData = async () => {
        try {
            const { data } = await axios.get<ARDataRecord[]>(
                "/api/import-ar/records",
            );
            setArData(data);
            setPageError(null);
        } catch (error: unknown) {
            setPageError(getErrorMessage(error));
        }
    };

    useEffect(() => {
        fetchImports();
        fetchArData();
        const interval = window.setInterval(fetchImports, 10000);
        return () => window.clearInterval(interval);
    }, []);

    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadError("Please select a file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        setUploading(true);
        setUploadError(null);

        try {
            const response = await axios.post(
                "/api/import-ar/upload",
                formData,
            );
            await axios.post(`/api/import-ar/${response.data.id}/process`);
            await fetchImports();
            await fetchArData();
            setSelectedFile(null);
            setIsPopoverOpen(false);
        } catch (error: unknown) {
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
        } catch (error: unknown) {
            const message = getErrorMessage(error);
            setUploadError(message);
            setPageError(message);
        }
    };

    return (
        <SidebarLayout>
            <div className="p-5">
                <div className="flex justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">AR data</h1>
                        <p className="text-sm text-muted-foreground">
                            Senin, 4 Mei 2025
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
                            <h4 className="text-lg font-medium">
                                Total AR Data
                            </h4>
                            <p className="mt-1 text-3xl font-semibold">
                                {arData.length}
                            </p>
                        </div>
                        <Popover
                            open={isPopoverOpen}
                            onOpenChange={setIsPopoverOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button variant="secondary">
                                    Upload Excel
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" className="w-80">
                                <PopoverHeader>
                                    <PopoverTitle>Upload AR Data</PopoverTitle>
                                    <PopoverDescription>
                                        Upload an Excel or CSV file to import AR
                                        data.
                                    </PopoverDescription>
                                </PopoverHeader>

                                <div className="space-y-3 pt-2">
                                    <label className="block text-sm font-medium text-foreground">
                                        File
                                    </label>
                                    <Input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={(event) => {
                                            setSelectedFile(
                                                event.target.files?.[0] ?? null,
                                            );
                                            setUploadError(null);
                                        }}
                                    />
                                    {uploadError ? (
                                        <p className="text-sm text-destructive">
                                            {uploadError}
                                        </p>
                                    ) : null}
                                    <Button
                                        className="w-full"
                                        onClick={handleUpload}
                                        disabled={uploading}
                                    >
                                        {uploading
                                            ? "Uploading..."
                                            : "Upload & Process"}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="mt-10 space-y-8">
                    <section className="bg-white rounded-md p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Uploaded Excel Files
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Recent AR uploads and import status.
                                </p>
                            </div>
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
                                {imports.map((importFile) => (
                                    <TableRow key={importFile.id}>
                                        <TableCell>
                                            {importFile.original_name}
                                        </TableCell>
                                        <TableCell>
                                            <span className="rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground bg-muted/70">
                                                {importFile.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                importFile.created_at,
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {importFile.processed_at
                                                ? new Date(
                                                      importFile.processed_at,
                                                  ).toLocaleString()
                                                : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleProcess(importFile.id)
                                                }
                                                disabled={
                                                    importFile.status ===
                                                    "processing"
                                                }
                                            >
                                                {importFile.status ===
                                                "processing"
                                                    ? "Processing"
                                                    : "Process"}
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

                    <section className="bg-white rounded-md p-6 shadow-sm">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold">
                                Imported AR Data
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Imported AR records from the latest Excel
                                uploads.
                            </p>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NIP</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {arData.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.nip}</TableCell>
                                        <TableCell>{row.username}</TableCell>
                                        <TableCell>
                                            <EditARPopover
                                                row={row}
                                                onSave={(updated) => {
                                                    setArData((prev) =>
                                                        prev.map((r) =>
                                                            r.id === updated.id
                                                                ? updated
                                                                : r,
                                                        ),
                                                    );
                                                }}
                                                onDelete={(id) => {
                                                    setArData((prev) =>
                                                        prev.filter(
                                                            (r) => r.id !== id,
                                                        ),
                                                    );
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableCaption>
                                {arData.length === 0
                                    ? "No AR data imported yet."
                                    : `${arData.length} AR records loaded.`}
                            </TableCaption>
                        </Table>
                    </section>
                </div>
            </div>
        </SidebarLayout>
    );
}
