<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessARImportFile;
use App\Models\ARData;
use App\Models\ImportFileAR;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImportARController extends Controller
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

        return ImportFileAR::where('file_path', 'like', 'imports/ar-data/%')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function records()
    {
        $this->authorizeAdmin();

        return ARData::orderBy('username')
            ->limit(200)
            ->get();
    }

    public function upload(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate(
            ['file' => ['required', 'file', 'mimes:xlsx,xls,csv']]
        );

        $path = $request->file('file')->store('imports/ar-data');

        $importFile = ImportFileAR::create([
            'original_name' => $request->file('file')->getClientOriginalName(),
            'file_path' => $path,
            'status' => 'uploaded'
        ]);

        return response()->json([
            'message' => 'File uploaded successfully',
            'id' => $importFile->id
        ]);
    }
    public function process(ImportFileAR $importFile)
    {
        $this->authorizeAdmin();

        if ($importFile->status === 'processing') {
            return response()->json(['message' => 'Already being processed.'], 409);
        }

        ProcessARImportFile::dispatch($importFile);

        return response()->json(['message' => 'Import job has been queued.']);
    }
    public function status(ImportFileAR $importFile)
    {
        $this->authorizeAdmin();

        return response()->json([
            'status'       => $importFile->status,
            'processed_at' => $importFile->processed_at,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate([
            'nip' => ['required', 'string'],
            'username' => ['required', 'string'],
            'email' => ['nullable', 'email'],
            'password' => ['nullable', 'string'],
        ]);

        $arData = ARData::create($request->only([
            'nip',
            'username',
            'email',
            'password',
        ]));

        return response()->json($arData, 201);
    }

    public function update(Request $request, ARData $arData)
    {
        $this->authorizeAdmin();

        $request->validate([
            'nip' => ['required', 'string'],
            'username' => ['required', 'string'],
            'email' => ['nullable', 'email'],
            'password' => ['nullable', 'string'],
        ]);

        $arData->update($request->only([
            'nip',
            'username',
            'email',
            'password',
        ]));

        return response()->json($arData);
    }

    public function destroy(ARData $arData)
    {
        $this->authorizeAdmin();

        $arData->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
