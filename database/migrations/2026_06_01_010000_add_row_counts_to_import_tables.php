<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add row-count tracking to the Master Data (import_files) and AR
     * (import_file_a_r_s) import tables, mirroring monthly_spt_imports.
     */
    public function up(): void
    {
        foreach (['import_files', 'import_file_a_r_s'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->integer('total_rows')->default(0)->after('status');
                $table->integer('imported_rows')->default(0)->after('total_rows');
                $table->integer('invalid_rows')->default(0)->after('imported_rows');
            });
        }
    }

    public function down(): void
    {
        foreach (['import_files', 'import_file_a_r_s'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn(['total_rows', 'imported_rows', 'invalid_rows']);
            });
        }
    }
};
