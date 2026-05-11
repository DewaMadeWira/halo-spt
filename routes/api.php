<?php

use App\Http\Controllers\ImportARController;
use App\Http\Controllers\ImportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/import/upload',          [ImportController::class, 'upload']);
Route::post('/import/{importFile}/process', [ImportController::class, 'process']);
Route::get('/import/{importFile}/status',   [ImportController::class, 'status']);

Route::post('/import-ar/upload',          [ImportARController::class, 'upload']);
Route::post('/import-ar/{importFile}/process', [ImportARController::class, 'process']);
Route::get('/import-ar/{importFile}/status',   [ImportARController::class, 'status']);
