<?php

namespace App\Jobs;

use App\Imports\NpwpImport;
use App\Models\ImportFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ProcessImportFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 0;   // no timeout for large files

    public function __construct(public ImportFile $importFile) {}

    public function handle(): void
    {
        $this->importFile->update(['status' => 'processing']);

        try {
            // Excel::import(new NpwpImport(), storage_path('app/' . $this->importFile->file_path)); # DEFAULT FILE PATH
            Excel::import(new NpwpImport(), $this->importFile->file_path, 'local'); // WINDOWS FILE PATH

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
