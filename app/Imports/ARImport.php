<?php

namespace App\Imports;

use App\Models\ARData;
use App\Models\ImportFileAR;
use App\Models\ImportFileARInvalidRow;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Imports\Concerns\TracksImportProgress;
use Maatwebsite\Excel\Concerns\RemembersChunkOffset;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCalculatedFormulas;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ARImport implements ToCollection, WithHeadingRow, WithChunkReading, WithCalculatedFormulas, WithEvents
{
    use RemembersChunkOffset, TracksImportProgress;

    public function __construct(
        private ImportFileAR $importFile
    ) {}

    /**
     * Each valid AR row is upserted into ar_data AND provisioned as a
     * login account in the users table (role = ar), so imported ARs can
     * sign in without a separate registration step.
     *
     * @param Collection $collection
     */
    public function collection(Collection $collection)
    {
        // Stop cleanly if the user pressed Stop since the last chunk.
        $this->abortIfCancelled();

        $validRows   = [];
        $invalidRows = [];

        // bcrypt (rounds=12) costs ~300ms per hash. Hashing the shared default
        // password once instead of once per row is the difference between a
        // multi-minute import and a few seconds. The 'hashed' cast detects an
        // already-hashed value and won't re-hash it, so this is safe to pass.
        $hashedDefault = Hash::make((string) config('import.default_ar_password', 'password'));

        DB::transaction(function () use ($collection, &$validRows, &$invalidRows, $hashedDefault) {

            foreach ($collection as $index => $row) {
                // Per-chunk collections re-key from 0, so add the chunk's spreadsheet
                // start row (getChunkOffset()) to recover the true Excel row number.
                $rowNumber = $this->getChunkOffset() + $index;
                $username = trim((string) ($row['nama_pegawai'] ?? ''));
                $nip      = trim((string) ($row['nip'] ?? ''));
                $email    = trim((string) ($row['email'] ?? ''));
                $password = $row['password'] ?? null;

                if ($username === '') {
                    $invalidRows[] = $this->invalid($rowNumber, 'nama_pegawai', null, 'Employee name (nama_pegawai) is empty');
                    continue;
                }

                if ($nip === '') {
                    $invalidRows[] = $this->invalid($rowNumber, 'nip', null, 'NIP is empty');
                    continue;
                }

                // Email is required because it is the AR's login identity.
                if ($email === '') {
                    $invalidRows[] = $this->invalid($rowNumber, 'email', null, 'Email is required to create a login account');
                    continue;
                }

                if (Validator::make(['email' => $email], ['email' => 'email'])->fails()) {
                    $invalidRows[] = $this->invalid($rowNumber, 'email', $email, 'Email is not a valid address');
                    continue;
                }

                // Reject if this email already belongs to a different account.
                $existing = User::where('email', $email)->first();
                if ($existing && $existing->nip !== $nip) {
                    $invalidRows[] = $this->invalid($rowNumber, 'email', $email, 'Email already used by another user account');
                    continue;
                }

                // Only pay for a fresh bcrypt hash when the row supplies its own
                // password; otherwise reuse the pre-hashed default.
                $hashedPassword = $password ? Hash::make((string) $password) : $hashedDefault;

                // Provision / refresh the AR login account (matched by NIP).
                // email_verified_at is set here (admin-provisioned accounts skip
                // verification) so we avoid a second UPDATE per row.
                User::updateOrCreate(
                    ['nip' => $nip, 'role' => 'ar'],
                    [
                        'name'              => $username,
                        'email'             => $email,
                        'password'          => $hashedPassword, // already hashed; cast won't re-hash
                        'email_verified_at' => now(),
                    ]
                );

                $validRows[] = [
                    'username' => $username,
                    'nip'      => $nip,
                    'email'    => $email,
                    'password' => $password ?: null,
                ];
            }

            if (! empty($validRows)) {
                ARData::upsert(
                    $validRows,
                    ['nip'],
                    ['username', 'email', 'password']
                );
            }

            if (! empty($invalidRows)) {
                ImportFileARInvalidRow::insert($invalidRows);
            }
        });

        $this->importFile->increment('total_rows', $collection->count());
        $this->importFile->increment('imported_rows', count($validRows));
        $this->importFile->increment('invalid_rows', count($invalidRows));
    }

    private function invalid(int $rowNumber, string $field, ?string $value, string $reason): array
    {
        return [
            'import_file_a_r_id' => $this->importFile->id,
            'row_number'         => $rowNumber,
            'field'              => $field,
            'value'              => $value,
            'reason'             => $reason,
            'created_at'         => now(),
        ];
    }

    public function chunkSize(): int
    {
        return 500;
    }
}
