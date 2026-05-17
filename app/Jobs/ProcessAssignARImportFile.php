<?php

namespace App\Jobs;

use App\Imports\AssignARImport;
use App\Models\ImportFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ProcessAssignARImportFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 0;

    public function __construct(public ImportFile $importFile) {}

    public function handle(): void
    {
        $this->importFile->update(['status' => 'processing']);

        try {
            Excel::import(new AssignARImport(), $this->importFile->file_path, 'local');

            $this->importFile->update([
                'status' => 'done',
                'processed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $this->importFile->update(['status' => 'failed']);

            Log::error('Assign AR Excel import job failed', [
                'import_file_id' => $this->importFile->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
