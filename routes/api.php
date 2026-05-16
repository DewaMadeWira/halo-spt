<?php

use App\Http\Controllers\ImportARController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\ImportMasterDataController;
use App\Http\Controllers\ImportMonthlySptController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/import/upload',          [ImportController::class, 'upload']);
Route::post('/import/{importFile}/process', [ImportController::class, 'process']);
Route::get('/import/{importFile}/status',   [ImportController::class, 'status']);

Route::post('/import-ar/upload',          [ImportARController::class, 'upload']);
Route::post('/import-ar/{importFile}/process', [ImportARController::class, 'process']);
Route::get('/import-ar/{importFile}/status',   [ImportARController::class, 'status']);

Route::post('/master-data/import/upload', [ImportMasterDataController::class, 'upload']);
Route::post('/master-data/import/{importFile}/process', [ImportMasterDataController::class, 'process']);
Route::get('/master-data/imports', [ImportMasterDataController::class, 'index']);
Route::get('/master-data/import/{importFile}/status', [ImportMasterDataController::class, 'status']);
Route::get('/master-data/records', [ImportMasterDataController::class, 'records']);

Route::post('monthly-spt/upload', [ImportMonthlySptController::class, 'upload']);
Route::post('monthly-spt/{monthlySptImport}/process', [ImportMonthlySptController::class, 'process']);
Route::get('monthly-spt/{monthlySptImport}/status', [ImportMonthlySptController::class, 'status']);
Route::get('monthly-spt/{monthlySptImport}/invalid-rows', [ImportMonthlySptController::class, 'invalidRows']);
