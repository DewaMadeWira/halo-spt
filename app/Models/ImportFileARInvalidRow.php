<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportFileARInvalidRow extends Model
{
    public $timestamps = false;

    protected $table = 'import_file_a_r_invalid_rows';

    protected $fillable = [
        'import_file_a_r_id',
        'row_number',
        'field',
        'value',
        'reason',
        'created_at',
    ];
}
