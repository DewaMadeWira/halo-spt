<?php

namespace App\Imports;

use App\Models\AssignArData;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Validators\Failure;

class AssignARImport implements
    ToCollection,
    WithHeadingRow,
    WithChunkReading,
    WithValidation,
    SkipsOnFailure
{
    public function collection(Collection $collection)
    {
        $data = $collection->map(function ($row) {
            return [
                'npwp' => $row['npwp'],
                'nip' => $row['nip'],
                'period_year' => (int) $row['period_year'],
                'period_month' => (int) $row['period_month'],
                'updated_at' => now(),
                'created_at' => now(),
            ];
        })->toArray();

        AssignArData::upsert(
            $data,
            ['npwp', 'period_year', 'period_month'],
            ['nip', 'updated_at'],
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
            'nip' => ['required', 'string'],
            'period_year' => ['required', 'integer'],
            'period_month' => ['required', 'integer', 'between:1,12'],
        ];
    }

    public function onFailure(Failure ...$failures)
    {
        foreach ($failures as $failure) {
            Log::warning('Assign AR Excel import row skipped', [
                'row' => $failure->row(),
                'column' => $failure->attribute(),
                'errors' => $failure->errors(),
                'values' => $failure->values(),
            ]);
        }
    }
}
