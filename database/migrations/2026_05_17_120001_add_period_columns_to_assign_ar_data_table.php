<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('assign_ar_data', function (Blueprint $table) {
            $table->smallInteger('period_year')->default(now()->year)->after('nip');
            $table->tinyInteger('period_month')->default(now()->month)->after('period_year');
        });

        Schema::table('assign_ar_data', function (Blueprint $table) {
            $table->dropUnique('assign_ar_data_npwp_unique');
            $table->unique(['npwp', 'period_year', 'period_month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assign_ar_data', function (Blueprint $table) {
            $table->dropUnique(['npwp', 'period_year', 'period_month']);
            $table->unique('npwp');
            $table->dropColumn(['period_year', 'period_month']);
        });
    }
};
