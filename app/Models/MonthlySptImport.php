<?php

namespace App\Models;

use App\Enums\SptType;
use Illuminate\Database\Eloquent\Model;

class MonthlySptImport extends Model
{
    protected $table = 'monthly_spt_imports';

    protected $fillable = [
        // 'uploaded_by',
        'file_path',
        'original_filename',
        'period_month',
        'period_year',
        'spt_type',
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
        'spt_type'         => SptType::class,
        'cancel_requested' => 'boolean',
    ];

    public function records()
    {
        return $this->hasMany(MonthlySpt::class);
    }

    public function invalidRows()
    {
        return $this->hasMany(MonthlySptInvalidRow::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
