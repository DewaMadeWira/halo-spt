<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add progress-bar + cooperative-cancel support to all three import tables.
     *
     * expected_rows    — total data rows detected up front (denominator for the
     *                    UI progress bar); null when the count is unavailable.
     * cancel_requested — flipped by the "Stop" action; the running import checks
     *                    it at each chunk boundary and aborts cleanly.
     */
    public function up(): void
    {
        foreach (['import_files', 'import_file_a_r_s', 'monthly_spt_imports'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->integer('expected_rows')->nullable()->after('invalid_rows');
                $table->boolean('cancel_requested')->default(false)->after('expected_rows');
            });
        }
    }

    public function down(): void
    {
        foreach (['import_files', 'import_file_a_r_s', 'monthly_spt_imports'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn(['expected_rows', 'cancel_requested']);
            });
        }
    }
};
