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
            'file'         => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:51200'],
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

    public function records(Request $request)
    {
        $this->authorizeAdmin();

        $query = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
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
            ->orderBy('master_data.npwp');

        if ($search = $request->input('search')) {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('master_data.npwp', 'like', $like)
                  ->orWhere('master_data.taxpayer_name', 'like', $like)
                  ->orWhere('ar_data.nip', 'like', $like);
            });
        }

        if (($status = $request->input('status')) && $status !== 'all') {
            $query->where('monthly_spts.status', $status);
        }

        $perPage = min(max((int) $request->input('per_page', 50), 10), 100);

        return response()->json($query->paginate($perPage));
    }

    public function myPeriods()
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'ar') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $arData = ARData::where('nip', $user->nip)->first();

        if (! $arData) {
            return response()->json([]);
        }

        return response()->json(
            MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
                ->where('monthly_spts.ar_data_id', $arData->id)
                ->select('monthly_spt_imports.period_year', 'monthly_spt_imports.period_month')
                ->distinct()
                ->orderByDesc('monthly_spt_imports.period_year')
                ->orderByDesc('monthly_spt_imports.period_month')
                ->get()
        );
    }

    public function myRecords(Request $request)
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'ar') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $arData = ARData::where('nip', $user->nip)->first();

        if (! $arData) {
            return response()->json([
                'data' => [], 'current_page' => 1, 'last_page' => 1,
                'per_page' => 50, 'total' => 0, 'from' => null, 'to' => null,
                'stats' => ['total' => 0, 'pending' => 0, 'done' => 0],
            ]);
        }

        $periodYear  = $request->input('period_year')  ? (int) $request->input('period_year')  : null;
        $periodMonth = $request->input('period_month') ? (int) $request->input('period_month') : null;

        // Stats scoped to the selected period (unaffected by search/status filter)
        $statsBase = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
            ->where('monthly_spts.ar_data_id', $arData->id);

        if ($periodYear && $periodMonth) {
            $statsBase->where('monthly_spt_imports.period_year', $periodYear)
                      ->where('monthly_spt_imports.period_month', $periodMonth);
        }

        $stats = [
            'total'   => (clone $statsBase)->count(),
            'pending' => (clone $statsBase)->where('monthly_spts.status', 'pending')->count(),
            'done'    => (clone $statsBase)->where('monthly_spts.status', 'done')->count(),
        ];

        $query = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
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
            ->orderBy('master_data.npwp');

        if ($periodYear && $periodMonth) {
            $query->where('monthly_spt_imports.period_year', $periodYear)
                  ->where('monthly_spt_imports.period_month', $periodMonth);
        }

        if ($search = $request->input('search')) {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('master_data.npwp', 'like', $like)
                  ->orWhere('master_data.taxpayer_name', 'like', $like);
            });
        }

        if (($status = $request->input('status')) && $status !== 'all') {
            $query->where('monthly_spts.status', $status);
        }

        $perPage = min(max((int) $request->input('per_page', 50), 10), 100);
        $paginator = $query->paginate($perPage);

        return response()->json(array_merge($paginator->toArray(), ['stats' => $stats]));
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
