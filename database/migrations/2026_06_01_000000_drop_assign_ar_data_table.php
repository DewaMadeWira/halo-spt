<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The assign_ar_data table is a legacy assignment design that was
     * superseded by monthly_spts. It has no model, controller, route, or
     * runtime query referencing it, so it can be dropped.
     */
    public function up(): void
    {
        Schema::dropIfExists('assign_ar_data');
    }

    /**
     * Reverse the migrations.
     *
     * Recreate the table in its final shape (master_data_id FK + period
     * columns) as left by the earlier migrations.
     */
    public function down(): void
    {
        Schema::create('assign_ar_data', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('master_data_id');
            $table->string('nip');
            $table->smallInteger('period_year')->default(now()->year);
            $table->tinyInteger('period_month')->default(now()->month);
            $table->timestamps();

            $table->unique(['master_data_id', 'period_year', 'period_month']);
            $table->foreign('master_data_id')->references('id')->on('master_data')->onDelete('restrict');
        });
    }
};
