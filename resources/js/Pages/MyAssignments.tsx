import { useEffect, useMemo, useState } from "react";
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

interface AssignedRecord {
    npwp: string;
    taxpayer_name: string | null;
    email: string | null;
    whatsapp_number: string | null;
    period_year: number;
    period_month: number;
}

function formatMonthLabel(year: number, month: number) {
    return new Date(year, month - 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
    });
}

function normalizeWhatsappNumber(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
        return "";
    }

    if (digits.startsWith("62")) {
        return digits;
    }

    if (digits.startsWith("0")) {
        return `62${digits.slice(1)}`;
    }

    return digits;
}

export default function MyAssignments() {
    const [records, setRecords] = useState<AssignedRecord[]>([]);
    const [search, setSearch] = useState("");
    const [pageError, setPageError] = useState<string | null>(null);

    const fetchRecords = async () => {
        try {
            const { data } = await axios.get<AssignedRecord[]>(
                "/api/assign-ar/my-records",
            );
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

    const filteredRecords = useMemo(() => {
        if (!search.trim()) {
            return records;
        }

        const normalized = search.trim().toLowerCase();

        return records.filter((record) =>
            [record.npwp, record.taxpayer_name ?? ""]
                .join(" ")
                .toLowerCase()
                .includes(normalized),
        );
    }, [records, search]);

    const groupedAssignments = useMemo(() => {
        const groups: Record<string, AssignedRecord[]> = {};

        filteredRecords.forEach((record) => {
            const key = `${record.period_year}-${String(record.period_month).padStart(
                2,
                "0",
            )}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(record);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredRecords]);

    return (
        <SidebarLayout>
            <div className="p-5">
                <div className="flex justify-between bg-white p-7 rounded-md items-center">
                    <div>
                        <h1 className="text-2xl">My Assignments</h1>
                        <p className="text-sm text-muted-foreground">
                            View assigned companies by assignment month.
                        </p>
                    </div>
                </div>

                {pageError ? (
                    <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {pageError}
                    </div>
                ) : null}

                <div className="mt-10 bg-white rounded-md p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h4 className="text-lg font-medium">
                                Total assigned companies
                            </h4>
                            <p className="mt-1 text-3xl font-semibold">
                                {records.length}
                            </p>
                        </div>
                        <div className="w-full max-w-sm">
                            <Input
                                placeholder="Search by NPWP or name"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-10 space-y-8">
                    {groupedAssignments.length === 0 ? (
                        <div className="rounded-md bg-white p-6 shadow-sm">
                            <p className="text-sm text-muted-foreground">
                                No assignments found for the selected search or
                                assigned period.
                            </p>
                        </div>
                    ) : (
                        groupedAssignments.map(([periodKey, entries]) => {
                            const [year, month] = periodKey.split("-");
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
                                                {entries.length} assigned company
                                                {entries.length === 1 ? "" : "ies"}
                                            </p>
                                        </div>
                                    </div>

                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>NPWP</TableHead>
                                                <TableHead>Company</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>WhatsApp</TableHead>
                                                <TableHead>Contact</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entries.map((row) => {
                                                const whatsappNumber = row.whatsapp_number
                                                    ? normalizeWhatsappNumber(row.whatsapp_number)
                                                    : "";
                                                const mailto = row.email
                                                    ? `mailto:${encodeURIComponent(row.email)}`
                                                    : undefined;
                                                const whatsappHref = whatsappNumber
                                                    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                                                          "Halo, saya ingin berdiskusi tentang NPWP yang terassign.",
                                                      )}`
                                                    : undefined;

                                                return (
                                                    <TableRow key={`${row.npwp}-${periodKey}`}>
                                                        <TableCell>{row.npwp}</TableCell>
                                                        <TableCell>
                                                            {row.taxpayer_name ?? "-"}
                                                        </TableCell>
                                                        <TableCell>{row.email ?? "-"}</TableCell>
                                                        <TableCell>{row.whatsapp_number ?? "-"}</TableCell>
                                                        <TableCell className="space-x-2">
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <a
                                                                    href={mailto ?? "#"}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className={
                                                                        !mailto
                                                                            ? "pointer-events-none opacity-50"
                                                                            : undefined
                                                                    }
                                                                >
                                                                    Email
                                                                </a>
                                                            </Button>
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <a
                                                                    href={whatsappHref ?? "#"}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className={
                                                                        !whatsappHref
                                                                            ? "pointer-events-none opacity-50"
                                                                            : undefined
                                                                    }
                                                                >
                                                                    WhatsApp
                                                                </a>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                        <TableCaption>
                                            Data is filtered by your assigned NIP and the
                                            selected month.
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
