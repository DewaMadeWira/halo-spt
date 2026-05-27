import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import Modal from "@/Components/Modal";
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
} from "@/Components/ui/combobox";
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

interface AssignARDataRecord {
    id: number;
    npwp: string;
    nip: string;
    period_year: number;
    period_month: number;
}

interface MasterDataRecord {
    id: number;
    npwp: string;
    taxpayer_name: string;
}

interface ARDataRecord {
    id: number;
    nip: string;
    username: string;
}

function EditAssignPopover({
    row,
    onSave,
    onDelete,
    masters,
    ars,
}: {
    row: AssignARDataRecord;
    onSave: (r: AssignARDataRecord) => void;
    onDelete: (id: number) => void;
    masters: MasterDataRecord[];
    ars: ARDataRecord[];
}) {
    const [open, setOpen] = useState(false);
    const [selectedMasterId, setSelectedMasterId] = useState<string | null>(
        null,
    );
    const [selectedNip, setSelectedNip] = useState<string>(row.nip);
    const [npwpInput, setNpwpInput] = useState<string>("");
    const [nipInput, setNipInput] = useState<string>("");
    const [year, setYear] = useState(String(row.period_year));
    const [month, setMonth] = useState(String(row.period_month));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const masterLabel = (m: MasterDataRecord) =>
        `${m.npwp} - ${m.taxpayer_name}`;
    const arLabel = (a: ARDataRecord) => `${a.nip} - ${a.username}`;

    // initialize selected ids and input labels from the row
    useEffect(() => {
        const m = masters.find((x) => x.npwp === row.npwp);
        if (m) {
            setSelectedMasterId(String(m.id));
            setNpwpInput(masterLabel(m));
        } else {
            setNpwpInput(row.npwp ?? "");
        }
    }, [row.npwp, masters]);

    useEffect(() => {
        const a = ars.find((x) => x.nip === row.nip);
        if (a) {
            setNipInput(arLabel(a));
        } else {
            setNipInput(row.nip ?? "");
        }
    }, [row.nip, ars]);

    const filteredMasters = useMemo(() => {
        const q = npwpInput.trim().toLowerCase();
        if (!q) return masters.slice(0, 100);
        return masters
            .filter(
                (m) =>
                    m.npwp.toLowerCase().includes(q) ||
                    (m.taxpayer_name ?? "").toLowerCase().includes(q),
            )
            .slice(0, 100);
    }, [masters, npwpInput]);

    const filteredArs = useMemo(() => {
        const q = nipInput.trim().toLowerCase();
        if (!q) return ars.slice(0, 100);
        return ars
            .filter(
                (a) =>
                    a.nip.toLowerCase().includes(q) ||
                    (a.username ?? "").toLowerCase().includes(q),
            )
            .slice(0, 100);
    }, [ars, nipInput]);

    const doSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const masterId = selectedMasterId
                ? parseInt(selectedMasterId, 10)
                : null;
            const { data } = await axios.put(
                `/api/assign-ar/records/${row.id}`,
                {
                    master_data_id: masterId,
                    nip: selectedNip,
                    period_year: parseInt(year, 10),
                    period_month: parseInt(month, 10),
                },
            );
            onSave(data);
            setOpen(false);
            toast.success("Assignment saved", {
                description: "Changes to the AR assignment have been saved.",
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
        try {
            await axios.delete(`/api/assign-ar/records/${row.id}`);
            onDelete(row.id);
            setOpen(false);
            toast.success("Assignment deleted", {
                description: "The AR assignment has been removed.",
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
                <PopoverContent side="right" className="w-80">
                    <PopoverHeader>
                        <PopoverTitle>Edit Assignment</PopoverTitle>
                        <PopoverDescription />
                    </PopoverHeader>
                    <div className="space-y-2 pt-2">
                        <label className="text-sm">NPWP</label>
                        <Combobox
                            value={selectedMasterId ?? ""}
                            inputValue={npwpInput}
                            onInputValueChange={(v: any) =>
                                setNpwpInput(String(v ?? ""))
                            }
                            onValueChange={(v: any) => {
                                setSelectedMasterId(v);
                                const m = masters.find(
                                    (x) => String(x.id) === String(v),
                                );
                                if (m) setNpwpInput(masterLabel(m));
                            }}
                        >
                            <ComboboxInput placeholder="Search NPWP or name" />
                            <ComboboxContent>
                                <ComboboxList>
                                    {filteredMasters.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                            No matches
                                        </div>
                                    ) : (
                                        filteredMasters.map((m) => (
                                            <ComboboxItem
                                                key={m.id}
                                                value={String(m.id)}
                                            >
                                                {masterLabel(m)}
                                            </ComboboxItem>
                                        ))
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>

                        <label className="text-sm">NIP</label>
                        <Combobox
                            value={selectedNip}
                            inputValue={nipInput}
                            onInputValueChange={(v: any) =>
                                setNipInput(String(v ?? ""))
                            }
                            onValueChange={(v: any) => {
                                setSelectedNip(v);
                                const a = ars.find((x) => x.nip === v);
                                if (a) setNipInput(arLabel(a));
                            }}
                        >
                            <ComboboxInput placeholder="Search NIP or username" />
                            <ComboboxContent>
                                <ComboboxList>
                                    {filteredArs.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                            No matches
                                        </div>
                                    ) : (
                                        filteredArs.map((a) => (
                                            <ComboboxItem
                                                key={a.id}
                                                value={a.nip}
                                            >
                                                {arLabel(a)}
                                            </ComboboxItem>
                                        ))
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>

                        <label className="text-sm">Period Year</label>
                        <Input
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                        />
                        <label className="text-sm">Period Month</label>
                        <Input
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
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
                        This will permanently delete the assignment. Continue?
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

export default function AssignARData() {
    const [imports, setImports] = useState<ImportFileRecord[]>([]);
    const [assignData, setAssignData] = useState<AssignARDataRecord[]>([]);
    const [masters, setMasters] = useState<MasterDataRecord[]>([]);
    const [ars, setArs] = useState<ARDataRecord[]>([]);
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
                "/api/assign-ar/imports",
            );
            setImports(data);
            setPageError(null);
        } catch (error: unknown) {
            setPageError(getErrorMessage(error));
        }
    };

    const fetchAssignData = async () => {
        try {
            const { data } = await axios.get<AssignARDataRecord[]>(
                "/api/assign-ar/records",
            );
            setAssignData(data);
            setPageError(null);
        } catch (error: unknown) {
            setPageError(getErrorMessage(error));
        }
    };

    const fetchMasters = async () => {
        try {
            const { data } = await axios.get<MasterDataRecord[]>(
                "/api/master-data/records",
            );
            setMasters(data);
        } catch (error: unknown) {
            // ignore
        }
    };

    const fetchArs = async () => {
        try {
            const { data } = await axios.get<ARDataRecord[]>(
                "/api/import-ar/records",
            );
            setArs(data);
        } catch (error: unknown) {
            // ignore
        }
    };

    useEffect(() => {
        fetchImports();
        fetchAssignData();
        fetchMasters();
        fetchArs();
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
                "/api/assign-ar/import/upload",
                formData,
            );
            await axios.post(
                `/api/assign-ar/import/${response.data.id}/process`,
            );
            await fetchImports();
            await fetchAssignData();
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
            await axios.post(`/api/assign-ar/import/${importFileId}/process`);
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
                        <h1 className="text-2xl">Assign AR data</h1>
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
                                Total Assigned AR Data
                            </h4>
                            <p className="mt-1 text-3xl font-semibold">
                                {assignData.length}
                            </p>
                        </div>
                        <Popover
                            open={isPopoverOpen}
                            onOpenChange={setIsPopoverOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button variant="secondary" className="bg-blue-600 text-white">
                                    Upload Excel
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" className="w-80">
                                <PopoverHeader>
                                    <PopoverTitle>
                                        Upload Assign AR Data
                                    </PopoverTitle>
                                    <PopoverDescription>
                                        Upload an Excel or CSV file to import AR
                                        assignment data. Include period_year and
                                        period_month columns for monthly
                                        tracking.
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
                                    Recent Assign AR uploads and import status.
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
                                Imported Assign AR Data
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Imported assignment rows from the latest Excel
                                uploads.
                            </p>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NPWP</TableHead>
                                    <TableHead>NIP</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignData.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.npwp}</TableCell>
                                        <TableCell>{row.nip}</TableCell>
                                        <TableCell>
                                            {row.period_year}/
                                            {String(row.period_month).padStart(
                                                2,
                                                "0",
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <EditAssignPopover
                                                row={row}
                                                masters={masters}
                                                ars={ars}
                                                onSave={(updated) =>
                                                    setAssignData((prev) =>
                                                        prev.map((r) =>
                                                            r.id === updated.id
                                                                ? updated
                                                                : r,
                                                        ),
                                                    )
                                                }
                                                onDelete={(id) =>
                                                    setAssignData((prev) =>
                                                        prev.filter(
                                                            (r) => r.id !== id,
                                                        ),
                                                    )
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableCaption>
                                {assignData.length === 0
                                    ? "No assigned AR data imported yet."
                                    : `${assignData.length} rows loaded.`}
                            </TableCaption>
                        </Table>
                    </section>
                </div>
            </div>
        </SidebarLayout>
    );
}
