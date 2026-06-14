<?php

namespace App\Imports\Concerns;

use App\Exceptions\ImportCancelledException;
use Maatwebsite\Excel\Events\BeforeImport;

/**
 * Shared progress + cooperative-cancel behaviour for the chunked imports.
 *
 * The using class must expose an `$importFile` Eloquent model that has
 * `expected_rows` and `cancel_requested` columns (all three import tables do).
 */
trait TracksImportProgress
{
    /**
     * Record the sheet's data-row count once, before any chunk is read, so the
     * UI can render a real percentage bar instead of an indeterminate spinner.
     */
    public function registerEvents(): array
    {
        return [
            BeforeImport::class => function (BeforeImport $event) {
                $totals = $event->getReader()->getTotalRows();
                $rows   = is_array($totals) ? (int) (reset($totals) ?: 0) : 0;

                // Subtract the heading row; clamp so a header-only sheet is 0.
                $this->importFile->update(['expected_rows' => max(0, $rows - 1)]);
            },
        ];
    }

    /**
     * Cooperative cancellation checked at each chunk boundary. The controller
     * flips cancel_requested in the DB; the model held in memory is a stale,
     * serialized copy, so we read the flag straight from the database.
     */
    protected function abortIfCancelled(): void
    {
        $cancelled = $this->importFile->newQuery()
            ->whereKey($this->importFile->getKey())
            ->value('cancel_requested');

        if ($cancelled) {
            throw new ImportCancelledException();
        }
    }
}
