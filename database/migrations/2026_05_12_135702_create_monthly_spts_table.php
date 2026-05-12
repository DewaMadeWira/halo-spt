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
        Schema::create('monthly_spts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_spt_import_id')->constrained('monthly_spt_imports');
            $table->foreignId('ar_data_id')->constrained('ar_data');
            $table->foreignId('master_data_id')->constrained('master_data');
            $table->enum('status', ['pending', 'contacted', 'done'])->default('pending');
            $table->timestamp('contacted_at')->nullable();
            $table->timestamp('done_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // upsert conflict key — one NPWP per AR per month
            $table->unique(['monthly_spt_import_id', 'master_data_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monthly_spts');
    }
};
