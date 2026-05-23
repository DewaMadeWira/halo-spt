<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessImportFile;
use App\Models\ImportFile;
use App\Models\MasterData;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImportMasterDataController extends Controller
{
    protected function authorizeAdmin(): void
    {
        if (Auth::user()?->role !== 'admin') {
            abort(403);
        }
    }

    public function index()
    {
        $this->authorizeAdmin();

        return ImportFile::where('file_path', 'like', 'imports/master-data/%')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function upload(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv'],
        ]);

        $path = $request->file('file')->store('imports/master-data');

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

        ProcessImportFile::dispatch($importFile);

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

        return MasterData::orderBy('taxpayer_name')
            ->limit(200)
            ->get();
    }

    public function update(Request $request, MasterData $masterData)
    {
        $this->authorizeAdmin();

        $request->validate([
            'npwp' => ['required', 'string'],
            'taxpayer_name' => ['required', 'string'],
            'email' => ['nullable', 'email'],
            'whatsapp_number' => ['nullable', 'string'],
        ]);

        $masterData->update($request->only([
            'npwp',
            'taxpayer_name',
            'email',
            'whatsapp_number',
        ]));

        return response()->json($masterData);
    }

    public function destroy(MasterData $masterData)
    {
        $this->authorizeAdmin();

        try {
            $masterData->delete();
        } catch (QueryException $e) {
            // SQLSTATE 23000 = integrity constraint violation (FK restrict)
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete: this master record is still assigned to AR data. Remove the assignments first.',
                ], 422);
            }
            throw $e;
        }

        return response()->json(['message' => 'Deleted']);
    }
}
