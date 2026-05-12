<?php

namespace App\Imports;

use App\Models\MasterData;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Validators\Failure;

class NpwpImport implements
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
                'npwp'           => $row['npwp'],
                'taxpayer_name'  => $row['nama_wp'],
                // 'ar_name'        => $row['nama_ar'],
                'email'          => $row['email'],
                'whatsapp_number' => $row['no_whatsapp'],
                'updated_at'     => now(),
                'created_at'     => now(),
            ];
        })->toArray();

        MasterData::upsert(
            $data,
            ['npwp'],
            [
                'taxpayer_name',
                // 'ar_name',
                'email',
                'whatsapp_number',
                'updated_at'
            ]
        );
    }
    public function chunkSize(): int
    {
        return 500;
    }

    public function rules(): array
    {
        return [
            'npwp' => ['required', 'string'],
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
