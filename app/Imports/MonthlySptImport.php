<?php

namespace App\Imports;

use App\Models\ARData;
use App\Models\MasterData;
use App\Models\MonthlySpt;
use App\Models\MonthlySptImport as MonthlySptImportModel;
use App\Models\MonthlySptInvalidRow;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithLimit;

class MonthlySptImport implements ToCollection, WithHeadingRow, WithChunkReading, WithLimit
{
    private int $importedRows = 0;
    private int $invalidRows  = 0;

    // Cached row cap; computed lazily in limit().
    private ?int $rowLimit = null;

    public function __construct(
        private MonthlySptImportModel $importFile
    ) {}

    public function collection(Collection $collection)
    {
        $validRows   = [];
        $invalidRows = [];

        // Batch the lookups for the whole chunk: two queries instead of two per row.
        $nips = $collection->pluck('nip')->map(fn ($v) => trim((string) $v))->filter()->unique();
        $npwps = $collection->pluck('npwp')->map(fn ($v) => trim((string) $v))->filter()->unique();

        // Keyed maps (value => id). ->get() is used below so leading-zero NIP/NPWP
        // keys are matched as strings rather than being cast to int.
        $arMap = ARData::whereIn('nip', $nips->all())->pluck('id', 'nip');
        $masterMap = MasterData::whereIn('npwp', $npwps->all())->pluck('id', 'npwp');

        foreach ($collection as $index => $row) {
            // Excel row number — +2 accounts for heading row and 0-index
            $rowNumber = $index + 2;
            $nip  = trim($row['nip']  ?? '');
            $npwp = trim($row['npwp'] ?? '');

            // Validate NIP present
            if (empty($nip)) {
                $invalidRows[] = [
                    'monthly_spt_import_id' => $this->importFile->id,
                    'row_number'            => $rowNumber,
                    'field'                 => 'nip',
                    'value'                 => null,
                    'reason'                => 'NIP is empty',
                    'created_at'            => now(),
                ];
                continue;
            }

            // Validate NPWP present
            if (empty($npwp)) {
                $invalidRows[] = [
                    'monthly_spt_import_id' => $this->importFile->id,
                    'row_number'            => $rowNumber,
                    'field'                 => 'npwp',
                    'value'                 => null,
                    'reason'                => 'NPWP is empty',
                    'created_at'            => now(),
                ];
                continue;
            }

            // Find AR by NIP
            $arId = $arMap->get($nip);
            if ($arId === null) {
                $invalidRows[] = [
                    'monthly_spt_import_id' => $this->importFile->id,
                    'row_number'            => $rowNumber,
                    'field'                 => 'nip',
                    'value'                 => $nip,
                    'reason'                => 'NIP not found in ar_data',
                    'created_at'            => now(),
                ];
                continue;
            }

            // Find MasterData by NPWP
            $masterDataId = $masterMap->get($npwp);
            if ($masterDataId === null) {
                $invalidRows[] = [
                    'monthly_spt_import_id' => $this->importFile->id,
                    'row_number'            => $rowNumber,
                    'field'                 => 'npwp',
                    'value'                 => $npwp,
                    'reason'                => 'NPWP not found in master_data',
                    'created_at'            => now(),
                ];
                continue;
            }

            $validRows[] = [
                'monthly_spt_import_id' => $this->importFile->id,
                'ar_data_id'            => $arId,
                'master_data_id'        => $masterDataId,
                'status'                => 'pending',
                'contacted_at'          => null,
                'done_at'               => null,
                'notes'                 => null,
                'created_at'            => now(),
                'updated_at'            => now(),
            ];
        }

        // Upsert valid rows
        if (!empty($validRows)) {
            MonthlySpt::upsert(
                $validRows,
                ['monthly_spt_import_id', 'master_data_id'], // conflict key
                ['ar_data_id', 'updated_at']                 // re-link only; never clobber status/contacted_at/done_at on re-import
            );
            $this->importedRows += count($validRows);
        }

        // Bulk insert invalid rows
        if (!empty($invalidRows)) {
            MonthlySptInvalidRow::insert($invalidRows);
            $this->invalidRows += count($invalidRows);
        }

        // Update counters on import file
        $this->importFile->increment('total_rows', $collection->count());
        $this->importFile->increment('imported_rows', count($validRows));
        $this->importFile->increment('invalid_rows', count($invalidRows));
    }

    public function chunkSize(): int
    {
        return 2000;
    }

    /**
     * Cap how many rows the chunk reader will walk.
     *
     * A worksheet can declare up to 1,048,576 rows even when only a few thousand
     * hold data (a "format an entire column" artifact bloats the file). Without a
     * cap, maatwebsite re-parses the whole sheet once per phantom chunk, pegging
     * CPU and memory until the worker is killed — leaving the import stuck.
     *
     * We only cap when the sheet is clearly bloated (many materialized rows far
     * past the real data) so a normal file is never at risk of truncation.
     */
    public function limit(): int
    {
        if ($this->rowLimit !== null) {
            return $this->rowLimit;
        }

        // Default: no effective cap (huge number → ChunkReader leaves totalRows as-is).
        $this->rowLimit = PHP_INT_MAX;

        $path = $this->importFile->file_path;

        // Only .xlsx can carry materialized phantom rows inside a zip part.
        if (! str_ends_with(strtolower((string) $path), '.xlsx')) {
            return $this->rowLimit;
        }

        [$lastDataRow, $lastRowSeen] = $this->detectRowExtent(Storage::disk('local')->path($path));

        if ($lastDataRow > 0 && $lastRowSeen > $lastDataRow + 1000) {
            $this->rowLimit = $lastDataRow + $this->chunkSize();
        }

        return $this->rowLimit;
    }

    /**
     * Stream the first worksheet's XML once and return:
     *   [highest row that actually contains a value, highest row present at all].
     *
     * Streaming (XMLReader) avoids loading the multi-MB sheet into memory. Returns
     * [0, 0] on any failure so the caller falls back to no cap (safe degradation).
     *
     * @return array{0:int,1:int}
     */
    private function detectRowExtent(string $absolutePath): array
    {
        $reader = new \XMLReader();

        if (! @$reader->open('zip://' . $absolutePath . '#xl/worksheets/sheet1.xml')) {
            return [0, 0];
        }

        $lastDataRow = 0;
        $lastRowSeen = 0;
        $currentRow  = 0;

        while (@$reader->read()) {
            if ($reader->nodeType !== \XMLReader::ELEMENT) {
                continue;
            }

            $name = $reader->localName;

            if ($name === 'row') {
                $currentRow = (int) $reader->getAttribute('r');
                if ($currentRow > $lastRowSeen) {
                    $lastRowSeen = $currentRow;
                }
            } elseif ($name === 'v' || $name === 't') {
                // A value (<v>) or inline-string text (<t>) means this row has data.
                if ($currentRow > $lastDataRow) {
                    $lastDataRow = $currentRow;
                }
            }
        }

        $reader->close();

        return [$lastDataRow, $lastRowSeen];
    }

    public function getImportedRows(): int
    {
        return $this->importedRows;
    }

    public function getInvalidRows(): int
    {
        return $this->invalidRows;
    }
}
