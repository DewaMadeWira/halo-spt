<?php

namespace App\Imports;

use App\Models\ARData;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Validators\Failure;

class ARImport implements
    ToCollection,
    WithHeadingRow,
    WithChunkReading,
    WithValidation,
    SkipsOnFailure
{
    /**
     * @param Collection $collection
     */
    public function collection(Collection $collection)
    {
        $data = $collection->map(function ($row) {
            return [
                'username' => $row["nama_pegawai"],
                'nip' => $row["nip"],
            ];
        })->toArray();

        ARData::upsert(
            $data,
            ['nip'],
            ['username']
        );
    }
    public function chunkSize(): int
    {
        return 500;
    }

    public function rules(): array
    {
        return [
            'nama_pegawai' => ['required', 'string'],
            'nip' => ['required', 'string'],
            // add other validation rules per column
        ];
    }

    public function onFailure(Failure ...$failures)
    {
        foreach ($failures as $failure) {
            Log::warning('Excel import row skipped', [
                'row'    => $failure->row(),
                'column' => $failure->attribute(),
                'errors' => $failure->errors(),
                'values' => $failure->values(),
            ]);
        }
    }
}
