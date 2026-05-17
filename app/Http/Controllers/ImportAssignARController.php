<?php

namespace App\Http\Controllers;

use App\Imports\AssignARImport;
use App\Jobs\ProcessAssignARImportFile;
use App\Models\AssignArData;
use App\Models\ImportFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImportAssignARController extends Controller
{
    protected function authorizeAdmin(): void
    {
        if (Auth::user()?->role !== 'admin') {
            abort(403);
        }
    }

    protected function authorizeAr(): void
    {
        if (Auth::user()?->role !== 'ar') {
            abort(403);
        }
    }

    public function index()
    {
        $this->authorizeAdmin();

        return ImportFile::where('file_path', 'like', 'imports/assign-ar/%')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function upload(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv'],
        ]);

        $path = $request->file('file')->store('imports/assign-ar');

        $importFile = ImportFile::create([
            'original_name' => $request->file('file')->getClientOriginalName(),
            'file_path' => $path,
            'status' => 'uploaded',
        ]);

        return response()->json([
            'message' => 'File uploaded successfully',
            'id' => $importFile->id,
        ]);
    }

    public function process(ImportFile $importFile)
    {
        $this->authorizeAdmin();

        if ($importFile->status === 'processing') {
            return response()->json(['message' => 'Already being processed.'], 409);
        }

        ProcessAssignARImportFile::dispatch($importFile);

        return response()->json(['message' => 'Import job has been queued.']);
    }

    public function status(ImportFile $importFile)
    {
        $this->authorizeAdmin();

        return response()->json([
            'status' => $importFile->status,
            'processed_at' => $importFile->processed_at,
        ]);
    }

    public function records()
    {
        $this->authorizeAdmin();

        return AssignArData::orderBy('period_year', 'desc')
            ->orderBy('period_month', 'desc')
            ->orderBy('npwp')
            ->limit(200)
            ->get();
    }

    public function myRecords()
    {
        $this->authorizeAr();

        $user = Auth::user();

        return AssignArData::where('nip', $user->nip)
            ->leftJoin('master_data', 'assign_ar_data.npwp', '=', 'master_data.npwp')
            ->select(
                'assign_ar_data.npwp',
                'master_data.taxpayer_name',
                'master_data.email',
                'master_data.whatsapp_number',
                'assign_ar_data.period_year',
                'assign_ar_data.period_month',
            )
            ->orderBy('assign_ar_data.period_year', 'desc')
            ->orderBy('assign_ar_data.period_month', 'desc')
            ->orderBy('assign_ar_data.npwp')
            ->get();
    }
}
