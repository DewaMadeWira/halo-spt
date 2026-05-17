import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
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

export default function AssignARData() {
    const [imports, setImports] = useState<ImportFileRecord[]>([]);
    const [assignData, setAssignData] = useState<AssignARDataRecord[]>([]);
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

    useEffect(() => {
        fetchImports();
        fetchAssignData();
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
                                <Button variant="secondary">
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
                                        period_month columns for monthly tracking.
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignData.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.npwp}</TableCell>
                                        <TableCell>{row.nip}</TableCell>
                                        <TableCell>
                                            {row.period_year}/{String(row.period_month).padStart(2, '0')}
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
