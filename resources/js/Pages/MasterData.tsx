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

interface MasterDataRecord {
    id: number;
    npwp: string;
    taxpayer_name: string;
    email: string | null;
    whatsapp_number: string | null;
}

export default function MasterData() {
    const [imports, setImports] = useState<ImportFileRecord[]>([]);
    const [masterData, setMasterData] = useState<MasterDataRecord[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const fetchImports = async () => {
        try {
            const { data } = await axios.get<ImportFileRecord[]>(
                "/api/master-data/imports",
            );
            setImports(data);
        } catch {
            // ignore for now
        }
    };

    const fetchMasterData = async () => {
        try {
            const { data } = await axios.get<MasterDataRecord[]>(
                "/api/master-data/records",
            );
            setMasterData(data);
        } catch {
            // ignore for now
        }
    };

    useEffect(() => {
        fetchImports();
        fetchMasterData();
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
                "/api/master-data/import/upload",
                formData,
            );

            await axios.post(
                `/api/master-data/import/${response.data.id}/process`,
            );
            await fetchImports();
            await fetchMasterData();
            setSelectedFile(null);
            setIsPopoverOpen(false);
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Upload failed. Please check the file and try again.";
            setUploadError(message);
        } finally {
            setUploading(false);
        }
    };

    const handleProcess = async (importFileId: number) => {
        try {
            await axios.post(`/api/master-data/import/${importFileId}/process`);
            await fetchImports();
        } catch {
            setUploadError("Unable to queue import process.");
        }
    };

    return (
        <SidebarLayout>
            <div className="p-5">
                <div className="flex justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">Master data</h1>
                        <p className="text-sm text-muted-foreground">
                            Senin, 4 Mei 2025
                        </p>
                    </div>
                </div>

                <div className="mt-10 p-7 bg-white rounded-md shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h4 className="text-lg font-medium">
                                Total Wajib Pajak
                            </h4>
                            <p className="mt-1 text-3xl font-semibold">
                                {masterData.length}
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
                                        Upload Master Data
                                    </PopoverTitle>
                                    <PopoverDescription>
                                        Upload an Excel or CSV file to import
                                        NPWP master data.
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
                                    Recent master data uploads and import
                                    status.
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
                                Imported Master Data
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Imported records from the latest Excel uploads.
                            </p>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>NPWP</TableHead>
                                    <TableHead>Taxpayer</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>WhatsApp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {masterData.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.npwp}</TableCell>
                                        <TableCell>
                                            {row.taxpayer_name}
                                        </TableCell>
                                        <TableCell>
                                            {row.email ?? "-"}
                                        </TableCell>
                                        <TableCell>
                                            {row.whatsapp_number ?? "-"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableCaption>
                                {masterData.length === 0
                                    ? "No master data imported yet."
                                    : `${masterData.length} master data records loaded.`}
                            </TableCaption>
                        </Table>
                    </section>
                </div>
            </div>
        </SidebarLayout>
    );
}
