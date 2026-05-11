<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportFileAR extends Model
{
    protected $fillable = [
        'original_name',
        'file_path',
        'status',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime'
    ];
}
