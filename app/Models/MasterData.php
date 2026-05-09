<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterData extends Model
{
    protected $table = 'master_data';
    protected $fillable = [
        'npwp',
        'taxpayer_name',
        'ar_name',
        'email',
        'whatsapp_number',
    ];
}
