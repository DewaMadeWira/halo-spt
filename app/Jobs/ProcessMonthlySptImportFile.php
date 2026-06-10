<?php

namespace App\Jobs;

use App\Imports\MonthlySptImport;
use App\Models\MonthlySptImport as MonthlySptImportModel;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ProcessMonthlySptImportFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Run once only — a partially-completed import must never be auto-retried.
    public int $tries = 1;

    // Finite, and kept BELOW the queue's retry_after so the job can never be
    // re-reserved while still running. (Ignored on Windows where pcntl is absent;
    // retry_after is the real guard there.) With batched lookups even large
    // imports finish in seconds, so this cap can be tight.
    public int $timeout = 600;

    public function __construct(public MonthlySptImportModel $importFile) {}

    /**
     * Prevent a second worker from running this same import concurrently if the
     * reservation ever lapses; the duplicate attempt is dropped, not released.
     */
    public function middleware(): array
    {
        return [
            (new WithoutOverlapping('import-monthly-spt-' . $this->importFile->id))
                ->dontRelease()
                ->expireAfter($this->timeout + 60),
        ];
    }

    public function handle(): void
    {
        // Reset counters and clear prior invalid rows so re-processing is idempotent.
        $this->importFile->invalidRows()->delete();
        $this->importFile->update([
            'status'        => 'processing',
            'total_rows'    => 0,
            'imported_rows' => 0,
            'invalid_rows'  => 0,
        ]);

        try {
            $import = new MonthlySptImport($this->importFile);

            Excel::import($import, $this->importFile->file_path, 'local');

            $this->importFile->update([
                'status'       => 'done',
                'processed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->importFile->update(['status' => 'failed']);

            Log::error('Monthly SPT import job failed', [
                'import_file_id' => $this->importFile->id,
                'error'          => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Runs when the job is abandoned for good — including the retry-exhaustion that
     * follows a hard-killed worker (queue:listen timeout, restart, OOM), which the
     * catch block above never sees. Without this the record would stay "processing"
     * forever; here it lands in "failed" so the UI can show it and offer a retry.
     */
    public function failed(\Throwable $e): void
    {
        $this->importFile->update(['status' => 'failed']);
    }
}
