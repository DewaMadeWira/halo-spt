interface ImportProgressProps {
    status: string;
    importedRows: number;
    invalidRows: number;
    expectedRows?: number | null;
    cancelRequested?: boolean;
}

/**
 * Inline progress indicator shown under an import row while it is processing.
 * Renders a real percentage bar when expected_rows is known, otherwise an
 * indeterminate (pulsing) bar with a live processed-row count.
 */
export function ImportProgress({
    status,
    importedRows,
    invalidRows,
    expectedRows,
    cancelRequested,
}: ImportProgressProps) {
    if (status !== "processing") return null;

    const processed = (importedRows ?? 0) + (invalidRows ?? 0);
    const hasTotal = typeof expectedRows === "number" && expectedRows > 0;
    const pct = hasTotal
        ? Math.min(100, Math.round((processed / (expectedRows as number)) * 100))
        : null;

    return (
        <div className="mt-2 w-48 max-w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {hasTotal ? (
                    <div
                        className="h-full rounded-full bg-blue-600 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                    />
                ) : (
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" />
                )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
                {cancelRequested ? "Stopping… " : ""}
                {processed.toLocaleString()}
                {hasTotal ? ` / ${(expectedRows as number).toLocaleString()}` : ""} rows
                {pct !== null ? ` (${pct}%)` : ""}
            </p>
        </div>
    );
}
