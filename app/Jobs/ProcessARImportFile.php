<?php

namespace App\Jobs;

use App\Imports\ARImport;
use App\Models\ImportFileAR;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ProcessARImportFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */

    public int $timeout = 0;
    public function __construct(public ImportFileAR $importFile)
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $this->importFile->update(['status' => 'processing']);
        try {
            Excel::import(new ARImport(), $this->importFile->file_path, 'local'); // WINDOWS FILE PATH

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
