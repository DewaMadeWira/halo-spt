<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonthlySpt extends Model
{
    protected $table = 'monthly_spts';

    protected $fillable = [
        'monthly_spt_import_id',
        'ar_data_id',
        'master_data_id',
        'status',
        'contacted_at',
        'done_at',
        'notes',
    ];

    protected $casts = [
        'contacted_at' => 'datetime',
        'done_at'      => 'datetime',
    ];

    public function import()
    {
        return $this->belongsTo(MonthlySptImport::class, 'monthly_spt_import_id');
    }

    public function arData()
    {
        return $this->belongsTo(ARData::class, 'ar_data_id');
    }

    public function masterData()
    {
        return $this->belongsTo(MasterData::class, 'master_data_id');
    }
}
