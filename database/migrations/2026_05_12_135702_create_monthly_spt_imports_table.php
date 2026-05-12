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
        Schema::create('monthly_spt_imports', function (Blueprint $table) {
            $table->id();
            // $table->foreignId('uploaded_by')->constrained('users');
            $table->string('file_path');
            $table->string('original_filename');
            $table->tinyInteger('period_month'); // 1-12
            $table->smallInteger('period_year');
            $table->enum('status', ['uploaded', 'processing', 'done', 'failed'])->default('uploaded');
            $table->integer('total_rows')->default(0);
            $table->integer('imported_rows')->default(0);
            $table->integer('invalid_rows')->default(0);
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monthly_spt_imports');
    }
};
