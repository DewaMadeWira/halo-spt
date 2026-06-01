<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-type invalid-row tables for the Master Data and AR imports,
     * mirroring monthly_spt_invalid_rows. Each row records why a single
     * spreadsheet row was rejected during import.
     */
    public function up(): void
    {
        Schema::create('import_file_invalid_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_file_id')->constrained('import_files')->cascadeOnDelete();
            $table->integer('row_number');
            $table->string('field')->nullable();  // which field caused the failure
            $table->string('value')->nullable();  // the value that failed
            $table->string('reason');              // human readable explanation
            $table->timestamp('created_at');
        });

        Schema::create('import_file_a_r_invalid_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_file_a_r_id')->constrained('import_file_a_r_s')->cascadeOnDelete();
            $table->integer('row_number');
            $table->string('field')->nullable();
            $table->string('value')->nullable();
            $table->string('reason');
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_file_a_r_invalid_rows');
        Schema::dropIfExists('import_file_invalid_rows');
    }
};
