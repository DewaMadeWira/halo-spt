<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default AR password
    |--------------------------------------------------------------------------
    |
    | When an AR row is imported without a password column, the auto-created
    | login account is given this temporary password. AR users should change
    | it after first login.
    |
    */
    'default_ar_password' => env('IMPORT_DEFAULT_AR_PASSWORD', 'password'),
];
