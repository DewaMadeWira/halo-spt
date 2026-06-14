<?php

namespace App\Jobs;

use App\Exceptions\ImportCancelledException;
use App\Imports\ARImport;
use App\Models\ImportFileAR;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ProcessARImportFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */

    // Run once only — a partially-completed import must never be auto-retried.
    public int $tries = 1;

    // Finite, and kept BELOW the queue's retry_after so the job can never be
    // re-reserved while still running. (Ignored on Windows where pcntl is absent;
    // retry_after is the real guard there.)
    public int $timeout = 7000;

    public function __construct(public ImportFileAR $importFile)
    {
        //
    }

    /**
     * Prevent a second worker from running this same import concurrently if the
     * reservation ever lapses; the duplicate attempt is dropped, not released.
     */
    public function middleware(): array
    {
        return [
            (new WithoutOverlapping('import-ar-' . $this->importFile->id))
                ->dontRelease()
                ->expireAfter($this->timeout + 60),
        ];
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Reset counters and clear prior invalid rows so re-processing is idempotent.
        $this->importFile->invalidRows()->delete();
        $this->importFile->update([
            'status'           => 'processing',
            'total_rows'       => 0,
            'imported_rows'    => 0,
            'invalid_rows'     => 0,
            'expected_rows'    => null,
            'cancel_requested' => false,
        ]);
        try {
            Excel::import(new ARImport($this->importFile), $this->importFile->file_path, 'local'); // WINDOWS FILE PATH

            $this->importFile->update([
                'status'       => 'done',
                'processed_at' => now(),
            ]);
        } catch (ImportCancelledException $e) {
            // User pressed Stop — land in "cancelled", not "failed", and do not
            // re-throw so the queue treats the job as completed.
            $this->importFile->update([
                'status'           => 'cancelled',
                'cancel_requested' => false,
                'processed_at'     => now(),
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
