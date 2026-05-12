<?php

namespace App\Imports;

use App\Models\ARData;
use App\Models\MasterData;
use App\Models\MonthlySpt;
use App\Models\MonthlySptImport as MonthlySptImportModel;
use App\Models\MonthlySptInvalidRow;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class MonthlySptImport implements ToCollection, WithHeadingRow, WithChunkReading
{
    private int $importedRows = 0;
    private int $invalidRows  = 0;

    public function __construct(
        private MonthlySptImportModel $importFile
    ) {}

    public function collection(Collection $collection)
    {
        $validRows   = [];
        $invalidRows = [];

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
            $ar = ARData::where('nip', $nip)->first();
            if (!$ar) {
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
            $masterData = MasterData::where('npwp', $npwp)->first();
            if (!$masterData) {
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
                'ar_data_id'            => $ar->id,
                'master_data_id'        => $masterData->id,
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
                ['ar_data_id', 'status', 'updated_at']        // update these on conflict
            );
            $this->importedRows += count($validRows);
        }

        // Bulk insert invalid rows
        if (!empty($invalidRows)) {
            MonthlySptInvalidRow::insert($invalidRows);
            $this->invalidRows += count($invalidRows);
        }

        // Update counters on import file
        $this->importFile->increment('imported_rows', count($validRows));
        $this->importFile->increment('invalid_rows', count($invalidRows));
    }

    public function chunkSize(): int
    {
        return 500;
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
