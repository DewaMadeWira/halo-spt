<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssignmentTemplate extends Model
{
    protected $table = 'assignment_templates';

    protected $fillable = [
        'user_id',
        'email_subject',
        'email_body',
        'whatsapp_body',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
