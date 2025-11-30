import lyricsWordList from '../data/word-list-generated.json';
import membersWordList from '../data/word-list-members.json';

interface WordEntry {
    word: string;
    reading: string;
}

type WordListByKana = Record<string, WordEntry[]>;

export class CpuPlayer {
    private usedWords: Set<string> = new Set();
    private wordListByKana: WordListByKana = {};
    private allWords: WordEntry[] = [];

    constructor() {
        // 複数のJSONファイルを結合
        this.wordListByKana = this.mergeWordLists([
            lyricsWordList as WordListByKana,
            membersWordList as WordListByKana
        ]);

        // 全単語を配列化（検索用）
        for (const words of Object.values(this.wordListByKana)) {
            this.allWords.push(...words);
        }
    }

    /**
     * 複数の単語リストを結合する
     */
    private mergeWordLists(lists: WordListByKana[]): WordListByKana {
        const merged: WordListByKana = {};

        for (const list of lists) {
            for (const [kana, words] of Object.entries(list)) {
                if (!merged[kana]) {
                    merged[kana] = [];
                }
                merged[kana].push(...words);
            }
        }

        // 各グループ内で重複を除去し、ソート
        for (const kana of Object.keys(merged)) {
            const uniqueWords = new Map<string, WordEntry>();

            for (const entry of merged[kana]) {
                const key = `${entry.reading}:${entry.word}`;
                if (!uniqueWords.has(key)) {
                    uniqueWords.set(key, entry);
                }
            }

            merged[kana] = Array.from(uniqueWords.values()).sort((a, b) =>
                a.reading.localeCompare(b.reading)
            );
        }

        return merged;
    }

    reset() {
        this.usedWords.clear();
    }

    addUsedWord(reading: string) {
        this.usedWords.add(reading);
    }

    /**
     * 読みから単語を検索する（ユーザー入力用）
     */
    findWordByReading(reading: string): WordEntry | null {
        const found = this.allWords.find(entry => entry.reading === reading);
        return found || null;
    }

    getNextWord(lastChar: string): { word: string; reading: string } | null {
        // 指定された文字から始まる単語のリストを取得
        const candidates = this.wordListByKana[lastChar] || [];

        // 既に使用された単語を除外
        const availableWords = candidates.filter(entry =>
            !this.usedWords.has(entry.reading)
        );

        if (availableWords.length === 0) {
            return null;
        }

        // ランダムに選択
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        const selected = availableWords[randomIndex];

        // 使用済みとしてマーク
        this.usedWords.add(selected.reading);

        return { word: selected.word, reading: selected.reading };
    }

    /**
     * デバッグ用: 読み込まれた単語リストの統計を取得
     */
    getStats() {
        const stats = {
            totalWords: 0,
            kanaCount: Object.keys(this.wordListByKana).length,
            byKana: {} as Record<string, number>
        };

        for (const [kana, words] of Object.entries(this.wordListByKana)) {
            stats.byKana[kana] = words.length;
            stats.totalWords += words.length;
        }

        return stats;
    }
}
