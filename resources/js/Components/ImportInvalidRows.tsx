import { useEffect, useState } from "react";
import axios from "axios";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/Components/ui/table";

export interface InvalidRow {
    id: number;
    row_number: number;
    field: string | null;
    value: string | null;
    reason: string;
}

/**
 * Fetches and renders the failed (invalid) rows for a single import file.
 * Mounted inside an expanded table row; refetches whenever `endpoint` changes.
 */
export function ImportInvalidRows({ endpoint }: { endpoint: string }) {
    const [rows, setRows] = useState<InvalidRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setRows(null);
        setError(null);
        axios
            .get<InvalidRow[]>(endpoint)
            .then(({ data }) => {
                if (active) setRows(data);
            })
            .catch((e) => {
                if (!active) return;
                setError(
                    axios.isAxiosError(e)
                        ? e.response?.data?.message ?? e.message
                        : "Failed to load failed rows."
                );
            });
        return () => {
            active = false;
        };
    }, [endpoint]);

    if (error) {
        return <div className="p-4 text-sm text-destructive">{error}</div>;
    }
    if (rows === null) {
        return <div className="p-4 text-sm text-muted-foreground">Loading failed rows…</div>;
    }
    if (rows.length === 0) {
        return <div className="p-4 text-sm text-muted-foreground">No failed rows for this file.</div>;
    }

    return (
        <div className="bg-muted/30 p-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-20">Row</TableHead>
                        <TableHead className="w-40">Field</TableHead>
                        <TableHead className="w-48">Value</TableHead>
                        <TableHead>Reason</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((r) => (
                        <TableRow key={r.id}>
                            <TableCell>{r.row_number}</TableCell>
                            <TableCell>{r.field ?? "-"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{r.value ?? "-"}</TableCell>
                            <TableCell>{r.reason}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
