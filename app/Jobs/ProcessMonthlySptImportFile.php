<?php

namespace App\Jobs;

use App\Imports\MonthlySptImport;
use App\Models\MonthlySptImport as MonthlySptImportModel;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ProcessMonthlySptImportFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 0;

    public function __construct(public MonthlySptImportModel $importFile) {}

    public function handle(): void
    {
        $this->importFile->update(['status' => 'processing']);

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
}
