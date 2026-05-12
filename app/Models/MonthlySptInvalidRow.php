<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonthlySptInvalidRow extends Model
{
    public $timestamps = false;

    protected $table = 'monthly_spt_invalid_rows';

    protected $fillable = [
        'monthly_spt_import_id',
        'row_number',
        'field',
        'value',
        'reason',
        'created_at',
    ];
}
