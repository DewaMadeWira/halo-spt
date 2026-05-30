import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "@/Components/ui/button";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
} from "@/Components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

const PER_PAGE_OPTIONS = [25, 50, 100];

export function DataTablePagination({
    meta,
    onPageChange,
    onPerPageChange,
    loading = false,
}: {
    meta: PaginationMeta;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    loading?: boolean;
}) {
    const { current_page, last_page, per_page, total, from, to } = meta;
    const isEmpty = total === 0;

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4 mt-2">
            <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                    {isEmpty
                        ? "No results"
                        : from != null && to != null
                        ? `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} rows`
                        : `${total.toLocaleString()} rows`}
                </p>
                <Select
                    value={String(per_page)}
                    onValueChange={(v) => onPerPageChange(Number(v))}
                    disabled={loading}
                >
                    <SelectTrigger size="sm" className="w-28">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PER_PAGE_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                                {n} / page
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {!isEmpty && (
                <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onPageChange(1)}
                                disabled={current_page === 1 || loading}
                                aria-label="First page"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onPageChange(current_page - 1)}
                                disabled={current_page === 1 || loading}
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <span className="px-2 text-sm text-muted-foreground tabular-nums">
                                {current_page} / {last_page}
                            </span>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onPageChange(current_page + 1)}
                                disabled={current_page === last_page || loading}
                                aria-label="Next page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onPageChange(last_page)}
                                disabled={current_page === last_page || loading}
                                aria-label="Last page"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
