<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessMonthlySptImportFile;
use App\Models\MonthlySptImport;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ImportMonthlySptController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file'         => ['required', 'file', 'mimes:xlsx,xls,csv'],
            // 'period_month' => ['required', 'integer', 'min:1', 'max:12'],
            // 'period_year'  => ['required', 'integer', 'min:2000'],
        ]);

        $path = $request->file('file')->store('imports/monthly-spt');

        $now = now();

        $importFile = MonthlySptImport::create([
            // 'uploaded_by'       => auth()->id(),
            'file_path'         => $path,
            'original_filename' => $request->file('file')->getClientOriginalName(),
            'period_month'      => $now->month,
            'period_year'       => $now->year,
            'status'            => 'uploaded',
        ]);

        return response()->json([
            'message' => 'File uploaded successfully',
            'id'      => $importFile->id,
        ]);
    }

    public function process(MonthlySptImport $monthlySptImport)
    {
        if ($monthlySptImport->status === 'processing') {
            return response()->json(['message' => 'Already being processed.'], 409);
        }

        ProcessMonthlySptImportFile::dispatch($monthlySptImport);

        return response()->json(['message' => 'Import job has been queued.']);
    }

    public function status(MonthlySptImport $monthlySptImport)
    {
        return response()->json([
            'status'        => $monthlySptImport->status,
            'period_month'  => $monthlySptImport->period_month,
            'period_year'   => $monthlySptImport->period_year,
            'total_rows'    => $monthlySptImport->total_rows,
            'imported_rows' => $monthlySptImport->imported_rows,
            'invalid_rows'  => $monthlySptImport->invalid_rows,
            'processed_at'  => $monthlySptImport->processed_at,
        ]);
    }

    public function invalidRows(MonthlySptImport $monthlySptImport)
    {
        return response()->json(
            $monthlySptImport->invalidRows()->orderBy('row_number')->get()
        );
    }
}
