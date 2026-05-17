<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssignArData extends Model
{
    protected $table = 'assign_ar_data';

    protected $fillable = [
        'npwp',
        'nip',
        'period_year',
        'period_month',
    ];
}
