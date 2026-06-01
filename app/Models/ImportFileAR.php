<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportFileAR extends Model
{
    protected $fillable = [
        'original_name',
        'file_path',
        'status',
        'total_rows',
        'imported_rows',
        'invalid_rows',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime'
    ];

    public function invalidRows()
    {
        return $this->hasMany(ImportFileARInvalidRow::class, 'import_file_a_r_id');
    }
}
