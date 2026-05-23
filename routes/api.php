<?php

use App\Http\Controllers\ImportARController;
use App\Http\Controllers\ImportAssignARController;
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
    Route::get('/import-ar/{importFile}/status', [ImportARController::class, 'status']);
    Route::get('/import-ar/imports', [ImportARController::class, 'index']);
    Route::get('/import-ar/records', [ImportARController::class, 'records']);
    Route::put('/import-ar/records/{arData}', [ImportARController::class, 'update']);
    Route::delete('/import-ar/records/{arData}', [ImportARController::class, 'destroy']);

    Route::post('/master-data/import/upload', [ImportMasterDataController::class, 'upload']);
    Route::post('/master-data/import/{importFile}/process', [ImportMasterDataController::class, 'process']);
    Route::get('/master-data/imports', [ImportMasterDataController::class, 'index']);
    Route::get('/master-data/import/{importFile}/status', [ImportMasterDataController::class, 'status']);
    Route::get('/master-data/records', [ImportMasterDataController::class, 'records']);
    Route::put('/master-data/records/{masterData}', [ImportMasterDataController::class, 'update']);
    Route::delete('/master-data/records/{masterData}', [ImportMasterDataController::class, 'destroy']);

    Route::post('/assign-ar/import/upload', [ImportAssignARController::class, 'upload']);
    Route::post('/assign-ar/import/{importFile}/process', [ImportAssignARController::class, 'process']);
    Route::get('/assign-ar/imports', [ImportAssignARController::class, 'index']);
    Route::get('/assign-ar/import/{importFile}/status', [ImportAssignARController::class, 'status']);
    Route::get('/assign-ar/records', [ImportAssignARController::class, 'records']);
    Route::put('/assign-ar/records/{assignArData}', [ImportAssignARController::class, 'update']);
    Route::delete('/assign-ar/records/{assignArData}', [ImportAssignARController::class, 'destroy']);
    Route::get('/assign-ar/my-records', [ImportAssignARController::class, 'myRecords']);

    Route::post('monthly-spt/upload', [ImportMonthlySptController::class, 'upload']);
    Route::post('monthly-spt/{monthlySptImport}/process', [ImportMonthlySptController::class, 'process']);
    Route::get('monthly-spt/{monthlySptImport}/status', [ImportMonthlySptController::class, 'status']);
    Route::get('monthly-spt/{monthlySptImport}/invalid-rows', [ImportMonthlySptController::class, 'invalidRows']);
});
