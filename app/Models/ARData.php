<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ARData extends Model
{
    protected $table = 'ar_data';
    protected $fillable = [
        'nip',
        'username'
    ];
}
