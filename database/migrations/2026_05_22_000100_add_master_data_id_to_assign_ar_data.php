<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // add nullable master_data_id
        Schema::table('assign_ar_data', function (Blueprint $table) {
            $table->unsignedBigInteger('master_data_id')->nullable()->after('id');
        });

        // backfill master_data_id where possible
        DB::table('assign_ar_data')
            ->join('master_data', 'assign_ar_data.npwp', '=', 'master_data.npwp')
            ->update(['assign_ar_data.master_data_id' => DB::raw('master_data.id')]);

        // delete rows that could not be resolved (reject orphans)
        DB::table('assign_ar_data')->whereNull('master_data_id')->delete();

        // drop whatever unique index currently exists on npwp (single or composite)
        $existingIndexes = collect(DB::select('SHOW INDEX FROM assign_ar_data'))
            ->pluck('Key_name')
            ->unique()
            ->values()
            ->all();

        foreach ($existingIndexes as $indexName) {
            if ($indexName === 'PRIMARY') {
                continue;
            }
            if (str_contains($indexName, 'npwp')) {
                DB::statement("ALTER TABLE `assign_ar_data` DROP INDEX `{$indexName}`");
            }
        }

        // remove npwp column (we will rely on master_data_id)
        if (Schema::hasColumn('assign_ar_data', 'npwp')) {
            Schema::table('assign_ar_data', function (Blueprint $table) {
                $table->dropColumn('npwp');
            });
        }

        // make master_data_id not nullable, add unique and fk
        Schema::table('assign_ar_data', function (Blueprint $table) {
            $table->unsignedBigInteger('master_data_id')->nullable(false)->change();
            $table->unique(['master_data_id', 'period_year', 'period_month']);
            $table->foreign('master_data_id')->references('id')->on('master_data')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::table('assign_ar_data', function (Blueprint $table) {
            $table->dropForeign(['master_data_id']);
            $table->dropUnique(['master_data_id', 'period_year', 'period_month']);
            $table->dropColumn('master_data_id');
            // restore npwp column as nullable
            $table->string('npwp')->nullable()->after('id');
            $table->unique('npwp');
        });
    }
};
