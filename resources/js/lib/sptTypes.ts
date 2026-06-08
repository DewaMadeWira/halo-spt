// Keep in sync with App\Enums\SptType (app/Enums/SptType.php)
export const SPT_TYPES = [
    { value: "pph_21", label: "PPh Pasal 21" },
    { value: "pph_22", label: "PPh Pasal 22" },
    { value: "pph_23", label: "PPh Pasal 23" },
    { value: "pph_26", label: "PPh Pasal 26" },
    { value: "pph_15", label: "PPh Pasal 15" },
    { value: "pph_4_2", label: "PPh Pasal 4 ayat 2" },
    { value: "pph_25", label: "PPh Pasal 25" },
    { value: "pph_final_umkm", label: "PPh Final UMKM" },
] as const;

export type SptTypeValue = (typeof SPT_TYPES)[number]["value"];

const SPT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    SPT_TYPES.map((t) => [t.value, t.label]),
);

export function sptTypeLabel(value: string | null | undefined): string {
    if (!value) return "-";
    return SPT_TYPE_LABELS[value] ?? value;
}
