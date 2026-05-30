<?php

namespace App\Http\Controllers;

use App\Models\ARData;
use App\Models\MonthlySpt;
use App\Models\MonthlySptImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImportMonthlySptController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file'         => ['required', 'file', 'mimes:xlsx,xls,csv'],
            'period_month' => ['required', 'integer', 'min:1', 'max:12'],
            'period_year'  => ['required', 'integer', 'min:2000'],
        ]);

        $path = $request->file('file')->store('imports/monthly-spt');

        $importFile = MonthlySptImport::create([
            'file_path'         => $path,
            'original_filename' => $request->file('file')->getClientOriginalName(),
            'period_month'      => $request->integer('period_month'),
            'period_year'       => $request->integer('period_year'),
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

        \App\Jobs\ProcessMonthlySptImportFile::dispatch($monthlySptImport);

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

    public function imports()
    {
        $imports = MonthlySptImport::orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'original_filename', 'period_month', 'period_year', 'status', 'total_rows', 'imported_rows', 'invalid_rows', 'created_at', 'processed_at']);

        return response()->json($imports);
    }

    public function records()
    {
        $this->authorizeAdmin();

        $records = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
            ->join('master_data', 'monthly_spts.master_data_id', '=', 'master_data.id')
            ->join('ar_data', 'monthly_spts.ar_data_id', '=', 'ar_data.id')
            ->select(
                'monthly_spts.id',
                'master_data.npwp',
                'master_data.taxpayer_name',
                'ar_data.nip',
                'monthly_spt_imports.period_month',
                'monthly_spt_imports.period_year',
                'monthly_spts.status',
                'monthly_spts.contacted_at',
                'monthly_spts.done_at',
                'monthly_spts.notes',
            )
            ->orderByDesc('monthly_spt_imports.period_year')
            ->orderByDesc('monthly_spt_imports.period_month')
            ->orderBy('master_data.npwp')
            ->limit(200)
            ->get();

        return response()->json($records);
    }

    public function myRecords()
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'ar') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $arData = ARData::where('nip', $user->nip)->first();

        if (! $arData) {
            return response()->json([]);
        }

        $records = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
            ->join('master_data', 'monthly_spts.master_data_id', '=', 'master_data.id')
            ->where('monthly_spts.ar_data_id', $arData->id)
            ->select(
                'monthly_spts.id',
                'master_data.npwp',
                'master_data.taxpayer_name',
                'master_data.email',
                'master_data.whatsapp_number',
                'monthly_spt_imports.period_month',
                'monthly_spt_imports.period_year',
                'monthly_spts.status',
                'monthly_spts.contacted_at',
                'monthly_spts.done_at',
                'monthly_spts.notes',
            )
            ->orderByDesc('monthly_spt_imports.period_year')
            ->orderByDesc('monthly_spt_imports.period_month')
            ->orderBy('master_data.npwp')
            ->get();

        return response()->json($records);
    }

    public function updateStatus(Request $request, MonthlySpt $monthlySpt)
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'ar') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $arData = ARData::where('nip', $user->nip)->first();

        if (! $arData || $monthlySpt->ar_data_id !== $arData->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'status' => ['required', 'in:contacted,done'],
        ]);

        $updates = ['status' => $request->status];

        if ($request->status === 'contacted' && ! $monthlySpt->contacted_at) {
            $updates['contacted_at'] = now();
        }

        if ($request->status === 'done') {
            if (! $monthlySpt->contacted_at) {
                $updates['contacted_at'] = now();
            }
            if (! $monthlySpt->done_at) {
                $updates['done_at'] = now();
            }
        }

        $monthlySpt->update($updates);

        return response()->json(['message' => 'Status updated.', 'status' => $monthlySpt->status]);
    }

    private function authorizeAdmin()
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'admin') {
            abort(403);
        }
    }
}
