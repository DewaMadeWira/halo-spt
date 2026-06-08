<?php

namespace App\Enums;

enum SptType: string
{
    case PPH_21         = 'pph_21';
    case PPH_22         = 'pph_22';
    case PPH_23         = 'pph_23';
    case PPH_26         = 'pph_26';
    case PPH_15         = 'pph_15';
    case PPH_4_2        = 'pph_4_2';
    case PPH_25         = 'pph_25';
    case PPH_FINAL_UMKM = 'pph_final_umkm';

    /**
     * Human-readable label for display.
     */
    public function label(): string
    {
        return match ($this) {
            self::PPH_21         => 'PPh Pasal 21',
            self::PPH_22         => 'PPh Pasal 22',
            self::PPH_23         => 'PPh Pasal 23',
            self::PPH_26         => 'PPh Pasal 26',
            self::PPH_15         => 'PPh Pasal 15',
            self::PPH_4_2        => 'PPh Pasal 4 ayat 2',
            self::PPH_25         => 'PPh Pasal 25',
            self::PPH_FINAL_UMKM => 'PPh Final UMKM',
        };
    }

    /**
     * All cases as [value => label] for selects / validation.
     *
     * @return array<string, string>
     */
    public static function options(): array
    {
        $options = [];
        foreach (self::cases() as $case) {
            $options[$case->value] = $case->label();
        }

        return $options;
    }

    /**
     * Validation rule string: "in:pph_21,pph_22,...".
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
