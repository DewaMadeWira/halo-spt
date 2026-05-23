<?php

namespace App\Http\Controllers;

use App\Models\ARData;
use App\Models\AssignArData;
use App\Models\ImportFile;
use App\Models\MasterData;
use Illuminate\Http\Request;
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

            $assignmentTrend = AssignArData::selectRaw(
                'period_year, period_month, count(*) as total',
            )
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
                    'title' => 'Assignments',
                    'value' => AssignArData::count(),
                    'description' => 'Total AR assignments loaded from imports.',
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
                'title' => 'Assignment volume',
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

            $dashboardData['recentAssignments'] = AssignArData::leftJoin('master_data', 'assign_ar_data.master_data_id', '=', 'master_data.id')
                ->select(
                    'assign_ar_data.nip',
                    'master_data.npwp as npwp',
                    'master_data.taxpayer_name as taxpayer_name',
                    'assign_ar_data.period_year',
                    'assign_ar_data.period_month',
                )
                ->orderByDesc('assign_ar_data.period_year')
                ->orderByDesc('assign_ar_data.period_month')
                ->orderBy('master_data.npwp')
                ->limit(5)
                ->get()
                ->map(function ($record) {
                    return [
                        'npwp' => $record->npwp,
                        'taxpayer_name' => $record->taxpayer_name,
                        'nip' => $record->nip,
                        'period' => sprintf('%d-%02d', $record->period_year, $record->period_month),
                    ];
                });

            $dashboardData['statusCounts'] = $importStatusCounts;
        } elseif ($user->role === 'ar') {
            $assignmentTrend = AssignArData::where('nip', $user->nip)
                ->selectRaw('period_year, period_month, count(*) as total')
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

            $mostRecentAssignment = AssignArData::where('nip', $user->nip)
                ->orderByDesc('period_year')
                ->orderByDesc('period_month')
                ->first();

            $dashboardData['summary'] = [
                [
                    'title' => 'Assigned companies',
                    'value' => AssignArData::where('nip', $user->nip)->count(),
                    'description' => 'Total company assignments for your account.',
                ],
                [
                    'title' => 'Unique taxpayers',
                    'value' => AssignArData::where('nip', $user->nip)->distinct('master_data_id')->count('master_data_id'),
                    'description' => 'Different taxpayer entities you are assigned to.',
                ],
                [
                    'title' => 'Latest assignment',
                    'value' => $mostRecentAssignment ? sprintf('%d-%02d', $mostRecentAssignment->period_year, $mostRecentAssignment->period_month) : '—',
                    'description' => 'Most recent assignment month.',
                ],
                [
                    'title' => 'Accessible screen',
                    'value' => 'My Assignments',
                    'description' => 'Use the sidebar to access your assignment details.',
                ],
            ];

            $dashboardData['chart'] = [
                'title' => 'Your assignment trend',
                'data' => $assignmentTrend,
            ];

            $dashboardData['recentAssignments'] = AssignArData::where('assign_ar_data.nip', $user->nip)
                ->leftJoin('master_data', 'assign_ar_data.master_data_id', '=', 'master_data.id')
                ->select(
                    'master_data.npwp as npwp',
                    'master_data.taxpayer_name as taxpayer_name',
                    'master_data.email as email',
                    'master_data.whatsapp_number as whatsapp_number',
                    'assign_ar_data.period_year',
                    'assign_ar_data.period_month',
                )
                ->orderByDesc('assign_ar_data.period_year')
                ->orderByDesc('assign_ar_data.period_month')
                ->limit(5)
                ->get()
                ->map(function ($record) {
                    return [
                        'npwp' => $record->npwp,
                        'taxpayer_name' => $record->taxpayer_name,
                        'email' => $record->email,
                        'whatsapp_number' => $record->whatsapp_number,
                        'period' => sprintf('%d-%02d', $record->period_year, $record->period_month),
                    ];
                });
        }

        return Inertia::render('Dashboard', [
            'dashboard' => $dashboardData,
        ]);
    }
}
