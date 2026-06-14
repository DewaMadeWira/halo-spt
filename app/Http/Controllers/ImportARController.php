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

    public function records(Request $request)
    {
        $this->authorizeAdmin();

        $query = ARData::query();

        if ($search = $request->input('search')) {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('nip', 'like', $like)
                  ->orWhere('username', 'like', $like);
            });
        }

        $perPage = min(max((int) $request->input('per_page', 50), 10), 100);

        return response()->json($query->orderBy('username')->paginate($perPage));
    }

    public function upload(Request $request)
    {
        $this->authorizeAdmin();

        $request->validate(
            ['file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:51200']]
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

    public function cancel(ImportFileAR $importFile)
    {
        $this->authorizeAdmin();

        if ($importFile->status !== 'processing') {
            return response()->json(['message' => 'Import is not running.'], 409);
        }

        $importFile->update(['cancel_requested' => true]);

        return response()->json(['message' => 'Stopping import…']);
    }

    public function status(ImportFileAR $importFile)
    {
        $this->authorizeAdmin();

        return response()->json([
            'status'           => $importFile->status,
            'total_rows'       => $importFile->total_rows,
            'imported_rows'    => $importFile->imported_rows,
            'invalid_rows'     => $importFile->invalid_rows,
            'expected_rows'    => $importFile->expected_rows,
            'cancel_requested' => $importFile->cancel_requested,
            'processed_at'     => $importFile->processed_at,
        ]);
    }

    public function invalidRows(ImportFileAR $importFile)
    {
        $this->authorizeAdmin();

        return response()->json(
            $importFile->invalidRows()->orderBy('row_number')->get()
        );
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
