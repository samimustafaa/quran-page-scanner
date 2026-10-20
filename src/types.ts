export type Verse = {key: string; surah: string; surahArabic: string; surahNumber: number; ayah: number; juz: number; arabic: string; translation: string};
export type QuranPage = {page: number; juz: number[]; surahs: string[]; translator: string; edition: string; verses: Verse[]};
export type ScanResponse = {status: 'matched' | 'uncertain'; result?: QuranPage; reason?: string; candidates: {page: number; score: number}[]};
