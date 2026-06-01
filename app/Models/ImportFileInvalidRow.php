<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportFileInvalidRow extends Model
{
    public $timestamps = false;

    protected $table = 'import_file_invalid_rows';

    protected $fillable = [
        'import_file_id',
        'row_number',
        'field',
        'value',
        'reason',
        'created_at',
    ];
}
