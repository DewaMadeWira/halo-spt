<?php

use App\Http\Controllers\AssignmentTemplateController;
use App\Http\Controllers\ImportARController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\ImportMasterDataController;
use App\Http\Controllers\ImportMonthlySptController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->group(function () {
    Route::post('/import/upload', [ImportController::class, 'upload']);
    Route::post('/import/{importFile}/process', [ImportController::class, 'process']);
    Route::get('/import/{importFile}/status', [ImportController::class, 'status']);

    Route::post('/import-ar/upload', [ImportARController::class, 'upload']);
    Route::post('/import-ar/{importFile}/process', [ImportARController::class, 'process']);
    Route::post('/import-ar/{importFile}/cancel', [ImportARController::class, 'cancel']);
    Route::get('/import-ar/{importFile}/status', [ImportARController::class, 'status']);
    Route::get('/import-ar/{importFile}/invalid-rows', [ImportARController::class, 'invalidRows']);
    Route::get('/import-ar/imports', [ImportARController::class, 'index']);
    Route::get('/import-ar/records', [ImportARController::class, 'records']);
    Route::post('/import-ar/records', [ImportARController::class, 'store']);
    Route::put('/import-ar/records/{arData}', [ImportARController::class, 'update']);
    Route::delete('/import-ar/records/{arData}', [ImportARController::class, 'destroy']);

    Route::post('/master-data/import/upload', [ImportMasterDataController::class, 'upload']);
    Route::post('/master-data/import/{importFile}/process', [ImportMasterDataController::class, 'process']);
    Route::post('/master-data/import/{importFile}/cancel', [ImportMasterDataController::class, 'cancel']);
    Route::get('/master-data/imports', [ImportMasterDataController::class, 'index']);
    Route::get('/master-data/import/{importFile}/status', [ImportMasterDataController::class, 'status']);
    Route::get('/master-data/import/{importFile}/invalid-rows', [ImportMasterDataController::class, 'invalidRows']);
    Route::get('/master-data/records', [ImportMasterDataController::class, 'records']);
    Route::put('/master-data/records/{masterData}', [ImportMasterDataController::class, 'update']);
    Route::delete('/master-data/records/{masterData}', [ImportMasterDataController::class, 'destroy']);

    Route::post('/monthly-spt/upload', [ImportMonthlySptController::class, 'upload']);
    Route::post('/monthly-spt/{monthlySptImport}/process', [ImportMonthlySptController::class, 'process']);
    Route::post('/monthly-spt/{monthlySptImport}/cancel', [ImportMonthlySptController::class, 'cancel']);
    Route::get('/monthly-spt/{monthlySptImport}/status', [ImportMonthlySptController::class, 'status']);
    Route::get('/monthly-spt/{monthlySptImport}/invalid-rows', [ImportMonthlySptController::class, 'invalidRows']);
    Route::get('/monthly-spt/imports', [ImportMonthlySptController::class, 'imports']);
    Route::get('/monthly-spt/records', [ImportMonthlySptController::class, 'records']);
    Route::get('/monthly-spt/my-periods', [ImportMonthlySptController::class, 'myPeriods']);
    Route::get('/monthly-spt/my-records', [ImportMonthlySptController::class, 'myRecords']);
    Route::patch('/monthly-spt/{monthlySpt}/status', [ImportMonthlySptController::class, 'updateStatus']);

    Route::get('/assignment-templates', [AssignmentTemplateController::class, 'show']);
    Route::put('/assignment-templates', [AssignmentTemplateController::class, 'update']);
});
