<?php

namespace App\Http\Controllers;

use App\Models\AssignmentTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AssignmentTemplateController extends Controller
{
    private const DEFAULTS = [
        'email_subject' => 'Pengingat SPT Masa {{period}}',
        'email_body'    => "Yth. Bapak/Ibu Pimpinan {{company}},\n\nBerdasarkan pantauan sistem kami, Anda belum melakukan pelaporan SPT Masa untuk bulan {{period}} yang telah melewati jatuh tempo.\n\nMohon segera laporkan kewajiban perpajakan Anda (NPWP: {{npwp}}) sesegera mungkin.\n\nJika ada kendala, silakan hubungi kami.\n\nSalam,\n{{ar_name}} - Account Representative Anda",
        'whatsapp_body' => "Yth. Bapak/Ibu Pimpinan {{company}},\n\nMohon segera menindaklanjuti pelaporan SPT Masa untuk bulan {{period}} (NPWP: {{npwp}}). Jika butuh bantuan, silakan hubungi saya.\n\nTerima kasih.\n{{ar_name}}",
    ];

    public function show()
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'ar') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $template = AssignmentTemplate::where('user_id', $user->id)->first();

        return response()->json([
            'email_subject' => $template->email_subject ?? self::DEFAULTS['email_subject'],
            'email_body'    => $template->email_body ?? self::DEFAULTS['email_body'],
            'whatsapp_body' => $template->whatsapp_body ?? self::DEFAULTS['whatsapp_body'],
        ]);
    }

    public function update(Request $request)
    {
        $user = Auth::user();

        if (! $user || $user->role !== 'ar') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'email_subject' => ['required', 'string', 'max:255'],
            'email_body'    => ['required', 'string'],
            'whatsapp_body' => ['required', 'string'],
        ]);

        $template = AssignmentTemplate::updateOrCreate(
            ['user_id' => $user->id],
            $validated,
        );

        return response()->json([
            'message'       => 'Template saved successfully.',
            'email_subject' => $template->email_subject,
            'email_body'    => $template->email_body,
            'whatsapp_body' => $template->whatsapp_body,
        ]);
    }
}
