<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessImportFile;
use App\Models\ImportFile;
use Illuminate\Http\Request;

class ImportController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate(
            [
                'file' => ['required', 'file', 'mimes:xlsx,xls,csv']
            ]
        );
        $path = $request->file('file')->store('imports');

        $importFile = ImportFile::create([
            'original_name' => $request->file('file')->getClientOriginalName(),
            'file_path' => $path,
            'status' => 'uploaded'
        ]);

        return response()->json([
            'message' => 'File uploaded successfully',
            'id' => $importFile->id
        ]);
    }

    public function process(ImportFile $importFile)
    {
        if ($importFile->status === 'processing') {
            return response()->json(['message' => 'Already being processed.'], 409);
        }

        ProcessImportFile::dispatch($importFile);

        return response()->json(['message' => 'Import job has been queued.']);
    }
    public function status(ImportFile $importFile)
    {
        return response()->json([
            'status'       => $importFile->status,
            'processed_at' => $importFile->processed_at,
        ]);
    }
}
