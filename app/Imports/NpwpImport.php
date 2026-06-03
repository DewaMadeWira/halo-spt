<?php

namespace App\Imports;

use App\Models\ImportFile;
use App\Models\ImportFileInvalidRow;
use App\Models\MasterData;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\RemembersChunkOffset;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class NpwpImport implements ToCollection, WithHeadingRow, WithChunkReading
{
    use RemembersChunkOffset;

    public function __construct(
        private ImportFile $importFile
    ) {}

    /**
     * @param Collection $collection
     */
    public function collection(Collection $collection)
    {
        $validRows   = [];
        $invalidRows = [];

        foreach ($collection as $index => $row) {
            // Per-chunk collections re-key from 0, so add the chunk's spreadsheet
            // start row (getChunkOffset()) to recover the true Excel row number.
            $rowNumber = $this->getChunkOffset() + $index;
            $npwp = trim((string) ($row['npwp'] ?? ''));

            if ($npwp === '') {
                $invalidRows[] = [
                    'import_file_id' => $this->importFile->id,
                    'row_number'     => $rowNumber,
                    'field'          => 'npwp',
                    'value'          => null,
                    'reason'         => 'NPWP is empty',
                    'created_at'     => now(),
                ];
                continue;
            }

            $validRows[] = [
                'npwp'            => $npwp,
                'taxpayer_name'   => $row['nama_wp'] ?? null,
                'email'           => $row['email'] ?? null,
                'whatsapp_number' => $row['no_whatsapp'] ?? null,
                'updated_at'      => now(),
                'created_at'      => now(),
            ];
        }

        if (! empty($validRows)) {
            MasterData::upsert(
                $validRows,
                ['npwp'],
                ['taxpayer_name', 'email', 'whatsapp_number', 'updated_at']
            );
        }

        if (! empty($invalidRows)) {
            ImportFileInvalidRow::insert($invalidRows);
        }

        $this->importFile->increment('total_rows', $collection->count());
        $this->importFile->increment('imported_rows', count($validRows));
        $this->importFile->increment('invalid_rows', count($invalidRows));
    }

    public function chunkSize(): int
    {
        return 500;
    }
}
