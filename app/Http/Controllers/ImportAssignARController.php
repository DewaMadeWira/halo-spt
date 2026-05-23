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

        return AssignArData::leftJoin('master_data', 'assign_ar_data.master_data_id', '=', 'master_data.id')
            ->orderBy('assign_ar_data.period_year', 'desc')
            ->orderBy('assign_ar_data.period_month', 'desc')
            ->orderBy('master_data.npwp')
            ->limit(200)
            ->get([
                'assign_ar_data.id',
                'master_data.npwp as npwp',
                'assign_ar_data.nip',
                'assign_ar_data.period_year',
                'assign_ar_data.period_month',
            ]);
    }

    public function myRecords()
    {
        $this->authorizeAr();

        $user = Auth::user();

        return AssignArData::where('assign_ar_data.nip', $user->nip)
            ->leftJoin('master_data', 'assign_ar_data.master_data_id', '=', 'master_data.id')
            ->select(
                'master_data.npwp',
                'master_data.taxpayer_name',
                'master_data.email',
                'master_data.whatsapp_number',
                'assign_ar_data.period_year',
                'assign_ar_data.period_month',
            )
            ->orderBy('assign_ar_data.period_year', 'desc')
            ->orderBy('assign_ar_data.period_month', 'desc')
            ->orderBy('master_data.npwp')
            ->get();
    }

    public function update(Request $request, AssignArData $assignArData)
    {
        $this->authorizeAdmin();

        $request->validate([
            'master_data_id' => ['required', 'integer', 'exists:master_data,id'],
            'nip' => ['required', 'string'],
            'period_year' => ['required', 'integer'],
            'period_month' => ['required', 'integer'],
        ]);

        $assignArData->update($request->only([
            'master_data_id',
            'nip',
            'period_year',
            'period_month',
        ]));

        // return the updated record with npwp for frontend
        $assignArData = AssignArData::leftJoin('master_data', 'assign_ar_data.master_data_id', '=', 'master_data.id')
            ->where('assign_ar_data.id', $assignArData->id)
            ->first([
                'assign_ar_data.id',
                'master_data.npwp as npwp',
                'assign_ar_data.nip',
                'assign_ar_data.period_year',
                'assign_ar_data.period_month',
            ]);

        return response()->json($assignArData);
    }

    public function destroy(AssignArData $assignArData)
    {
        $this->authorizeAdmin();

        $assignArData->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
