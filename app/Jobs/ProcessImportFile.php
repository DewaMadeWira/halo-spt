<?php

namespace App\Jobs;

use App\Imports\NpwpImport;
use App\Models\ImportFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ProcessImportFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Run once only — a partially-completed import must never be auto-retried.
    public int $tries = 1;

    // Finite, and kept BELOW the queue's retry_after so the job can never be
    // re-reserved while still running. (Ignored on Windows where pcntl is absent;
    // retry_after is the real guard there.)
    public int $timeout = 7000;

    public function __construct(public ImportFile $importFile) {}

    /**
     * Prevent a second worker from running this same import concurrently if the
     * reservation ever lapses; the duplicate attempt is dropped, not released.
     */
    public function middleware(): array
    {
        return [
            (new WithoutOverlapping('import-master-' . $this->importFile->id))
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
            // Excel::import(new NpwpImport($this->importFile), storage_path('app/' . $this->importFile->file_path)); # DEFAULT FILE PATH
            Excel::import(new NpwpImport($this->importFile), $this->importFile->file_path, 'local'); // WINDOWS FILE PATH

            $this->importFile->update([
                'status'       => 'done',
                'processed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->importFile->update(['status' => 'failed']);

            Log::error('Excel import job failed', [
                'import_file_id' => $this->importFile->id,
                'error'          => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
