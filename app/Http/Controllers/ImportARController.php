<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessARImportFile;
use App\Models\ImportFileAR;
use Illuminate\Http\Request;

class ImportARController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate(
            ['file' => ['required', 'file', 'mimes:xlsx,xls,csv']]
        );

        $path = $request->file('file')->store('imports');

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
        if ($importFile->status === 'processing') {
            return response()->json(['message' => 'Already being processed.'], 409);
        }

        ProcessARImportFile::dispatch($importFile);

        return response()->json(['message' => 'Import job has been queued.']);
    }
    public function status(ImportFileAR $importFile)
    {
        return response()->json([
            'status'       => $importFile->status,
            'processed_at' => $importFile->processed_at,
        ]);
    }
}
