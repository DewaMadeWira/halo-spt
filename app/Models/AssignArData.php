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
        'master_data_id',
    ];

    public function masterData()
    {
        return $this->belongsTo(\App\Models\MasterData::class, 'master_data_id');
    }
}
