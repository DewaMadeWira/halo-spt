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
        Schema::create('monthly_spt_invalid_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_spt_import_id')->constrained('monthly_spt_imports');
            $table->integer('row_number');
            $table->string('field')->nullable();  // which field caused the failure
            $table->string('value')->nullable();  // the value that failed
            $table->string('reason');             // human readable explanation
            $table->timestamp('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monthly_spt_invalid_rows');
    }
};
