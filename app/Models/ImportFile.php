<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportFile extends Model
{
    protected $fillable = [
        'original_name',
        'file_path',
        'status',
        'total_rows',
        'imported_rows',
        'invalid_rows',
        'expected_rows',
        'cancel_requested',
        'processed_at',
    ];

    protected $casts = [
        'processed_at'     => 'datetime',
        'cancel_requested' => 'boolean',
    ];

    public function invalidRows()
    {
        return $this->hasMany(ImportFileInvalidRow::class, 'import_file_id');
    }
}
