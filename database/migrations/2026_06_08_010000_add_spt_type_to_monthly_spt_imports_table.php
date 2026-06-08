<?php

use App\Enums\SptType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('monthly_spt_imports', function (Blueprint $table) {
            $table->string('spt_type')->nullable()->after('period_year')->index();
        });

        // Backfill existing imports so the column is never null going forward.
        DB::table('monthly_spt_imports')
            ->whereNull('spt_type')
            ->update(['spt_type' => SptType::PPH_21->value]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('monthly_spt_imports', function (Blueprint $table) {
            $table->dropIndex(['spt_type']);
            $table->dropColumn('spt_type');
        });
    }
};
