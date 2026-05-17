<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth'])->group(function () {
    Route::get('/master-data', function () {
        if (Auth::user()?->role !== 'admin') {
            abort(403);
        }

        return Inertia::render('MasterData');
    });

    Route::get('/ar-data', function () {
        if (Auth::user()?->role !== 'admin') {
            abort(403);
        }

        return Inertia::render('ARData');
    });

    Route::get('/assign-ar-data', function () {
        if (Auth::user()?->role !== 'admin') {
            abort(403);
        }

        return Inertia::render('AssignARData');
    });

    Route::get('/my-assignments', function () {
        if (Auth::user()?->role !== 'ar') {
            abort(403);
        }

        return Inertia::render('MyAssignments');
    });
});

Route::get('/dashboard', function () {
    $user = Auth::user();

    if ($user?->role === 'admin') {
        return redirect('/master-data');
    }

    if ($user?->role === 'ar') {
        return redirect('/my-assignments');
    }

    return redirect('/');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__ . '/auth.php';
