<?php

namespace App\Http\Controllers;

use App\Models\ARData;
use App\Models\ImportFile;
use App\Models\MasterData;
use App\Models\MonthlySpt;
use App\Models\MonthlySptImport;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        if (! $user) {
            abort(403);
        }

        $dashboardData = [
            'userName' => $user->name,
            'role' => $user->role,
        ];

        if ($user->role === 'admin') {
            $importStatusCounts = ImportFile::where('file_path', 'like', 'imports/%')
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status')
                ->toArray();

            $assignmentTrend = MonthlySptImport::selectRaw(
                'period_year, period_month, sum(imported_rows) as total',
            )
                ->where('status', 'done')
                ->groupBy('period_year', 'period_month')
                ->orderByDesc('period_year')
                ->orderByDesc('period_month')
                ->limit(6)
                ->get()
                ->reverse()
                ->values()
                ->map(function ($row) {
                    return [
                        'label' => sprintf('%d-%02d', $row->period_year, $row->period_month),
                        'count' => (int) $row->total,
                    ];
                });

            $dashboardData['summary'] = [
                [
                    'title' => 'Master records',
                    'value' => MasterData::count(),
                    'description' => 'Total taxpayer master records stored.',
                ],
                [
                    'title' => 'AR users',
                    'value' => ARData::count(),
                    'description' => 'Registered AR accounts in the system.',
                ],
                [
                    'title' => 'Monthly SPT tasks',
                    'value' => MonthlySpt::count(),
                    'description' => 'Total SPT collection tasks across all periods.',
                ],
                [
                    'title' => 'Pending imports',
                    'value' => ImportFile::where('file_path', 'like', 'imports/%')
                        ->where('status', 'uploaded')
                        ->count(),
                    'description' => 'Files waiting to be processed.',
                ],
            ];

            $dashboardData['chart'] = [
                'title' => 'SPT task volume by period',
                'data' => $assignmentTrend,
            ];

            $dashboardData['recentImports'] = ImportFile::where('file_path', 'like', 'imports/%')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['id', 'original_name', 'status', 'created_at', 'processed_at'])
                ->map(function ($record) {
                    return [
                        'id' => $record->id,
                        'name' => $record->original_name,
                        'status' => $record->status,
                        'created_at' => $record->created_at->toDateTimeString(),
                        'processed_at' => $record->processed_at ? $record->processed_at->toDateTimeString() : null,
                    ];
                });

            $dashboardData['recentAssignments'] = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
                ->join('master_data', 'monthly_spts.master_data_id', '=', 'master_data.id')
                ->join('ar_data', 'monthly_spts.ar_data_id', '=', 'ar_data.id')
                ->select(
                    'ar_data.nip',
                    'master_data.npwp',
                    'master_data.taxpayer_name',
                    'monthly_spt_imports.period_year',
                    'monthly_spt_imports.period_month',
                    'monthly_spts.status',
                )
                ->orderByDesc('monthly_spt_imports.period_year')
                ->orderByDesc('monthly_spt_imports.period_month')
                ->orderBy('master_data.npwp')
                ->limit(5)
                ->get()
                ->map(function ($record) {
                    return [
                        'npwp' => $record->npwp,
                        'taxpayer_name' => $record->taxpayer_name,
                        'nip' => $record->nip,
                        'period' => sprintf('%d-%02d', $record->period_year, $record->period_month),
                        'status' => $record->status,
                    ];
                });

            $dashboardData['statusCounts'] = $importStatusCounts;
        } elseif ($user->role === 'ar') {
            $arData = ARData::where('nip', $user->nip)->first();

            if ($arData) {
                $assignmentTrend = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
                    ->where('monthly_spts.ar_data_id', $arData->id)
                    ->selectRaw('monthly_spt_imports.period_year, monthly_spt_imports.period_month, count(*) as total')
                    ->groupBy('monthly_spt_imports.period_year', 'monthly_spt_imports.period_month')
                    ->orderByDesc('monthly_spt_imports.period_year')
                    ->orderByDesc('monthly_spt_imports.period_month')
                    ->limit(6)
                    ->get()
                    ->reverse()
                    ->values()
                    ->map(function ($row) {
                        return [
                            'label' => sprintf('%d-%02d', $row->period_year, $row->period_month),
                            'count' => (int) $row->total,
                        ];
                    });

                $mostRecentImport = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
                    ->where('monthly_spts.ar_data_id', $arData->id)
                    ->orderByDesc('monthly_spt_imports.period_year')
                    ->orderByDesc('monthly_spt_imports.period_month')
                    ->select('monthly_spt_imports.period_year', 'monthly_spt_imports.period_month')
                    ->first();

                $totalTasks   = MonthlySpt::where('ar_data_id', $arData->id)->count();
                $doneTasks    = MonthlySpt::where('ar_data_id', $arData->id)->where('status', 'done')->count();
                $pendingTasks = MonthlySpt::where('ar_data_id', $arData->id)->where('status', 'pending')->count();

                $dashboardData['summary'] = [
                    [
                        'title' => 'Total tasks',
                        'value' => $totalTasks,
                        'description' => 'Total SPT collection tasks assigned to you.',
                    ],
                    [
                        'title' => 'Completed',
                        'value' => $doneTasks,
                        'description' => 'Tasks you have marked as done.',
                    ],
                    [
                        'title' => 'Pending',
                        'value' => $pendingTasks,
                        'description' => 'Tasks still waiting to be followed up.',
                    ],
                    [
                        'title' => 'Latest period',
                        'value' => $mostRecentImport ? sprintf('%d-%02d', $mostRecentImport->period_year, $mostRecentImport->period_month) : '—',
                        'description' => 'Most recent assignment period.',
                    ],
                ];

                $dashboardData['chart'] = [
                    'title' => 'Your task trend',
                    'data' => $assignmentTrend,
                ];

                $dashboardData['recentAssignments'] = MonthlySpt::join('monthly_spt_imports', 'monthly_spts.monthly_spt_import_id', '=', 'monthly_spt_imports.id')
                    ->join('master_data', 'monthly_spts.master_data_id', '=', 'master_data.id')
                    ->where('monthly_spts.ar_data_id', $arData->id)
                    ->select(
                        'master_data.npwp',
                        'master_data.taxpayer_name',
                        'master_data.email',
                        'master_data.whatsapp_number',
                        'monthly_spt_imports.period_year',
                        'monthly_spt_imports.period_month',
                        'monthly_spts.status',
                    )
                    ->orderByDesc('monthly_spt_imports.period_year')
                    ->orderByDesc('monthly_spt_imports.period_month')
                    ->limit(5)
                    ->get()
                    ->map(function ($record) {
                        return [
                            'npwp' => $record->npwp,
                            'taxpayer_name' => $record->taxpayer_name,
                            'email' => $record->email,
                            'whatsapp_number' => $record->whatsapp_number,
                            'period' => sprintf('%d-%02d', $record->period_year, $record->period_month),
                            'status' => $record->status,
                        ];
                    });
            } else {
                $dashboardData['summary'] = [];
                $dashboardData['chart'] = ['title' => 'Your task trend', 'data' => []];
                $dashboardData['recentAssignments'] = [];
            }
        }

        return Inertia::render('Dashboard', [
            'dashboard' => $dashboardData,
        ]);
    }
}
