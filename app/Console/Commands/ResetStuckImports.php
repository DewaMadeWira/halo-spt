<?php

namespace App\Console\Commands;

use App\Models\ImportFile;
use App\Models\ImportFileAR;
use Illuminate\Console\Command;

class ResetStuckImports extends Command
{
    /**
     * Reset import files left in "processing" (e.g. after a worker died or a
     * job was re-reserved mid-run) back to "uploaded" so they can be queued
     * again. Counters and prior invalid rows are cleared too, mirroring what a
     * fresh run does, so the re-processed totals start clean.
     *
     * @var string
     */
    protected $signature = 'imports:reset-stuck
                            {--id= : Only reset the master-data import with this id}
                            {--ar-id= : Only reset the AR import with this id}
                            {--dry-run : List what would be reset without changing anything}';

    /**
     * @var string
     */
    protected $description = 'Reset import files stuck in "processing" back to "uploaded"';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $total  = 0;

        $total += $this->resetGroup(
            'Master data',
            ImportFile::where('status', 'processing')
                ->when($this->option('id'), fn ($q) => $q->where('id', $this->option('id'))),
            $dryRun
        );

        $total += $this->resetGroup(
            'AR data',
            ImportFileAR::where('status', 'processing')
                ->when($this->option('ar-id'), fn ($q) => $q->where('id', $this->option('ar-id'))),
            $dryRun
        );

        if ($total === 0) {
            $this->info('No imports are stuck in "processing".');
        } elseif ($dryRun) {
            $this->warn("Dry run: {$total} import(s) would be reset. Re-run without --dry-run to apply.");
        } else {
            $this->info("Reset {$total} import(s) to \"uploaded\". Re-queue them from the UI or with the Process action.");
        }

        return self::SUCCESS;
    }

    private function resetGroup(string $label, $query, bool $dryRun): int
    {
        $files = $query->get();

        foreach ($files as $file) {
            $this->line("  [{$label}] #{$file->id} {$file->original_name} (imported {$file->imported_rows})");

            if (! $dryRun) {
                $file->invalidRows()->delete();
                $file->update([
                    'status'        => 'uploaded',
                    'total_rows'    => 0,
                    'imported_rows' => 0,
                    'invalid_rows'  => 0,
                    'processed_at'  => null,
                ]);
            }
        }

        return $files->count();
    }
}
