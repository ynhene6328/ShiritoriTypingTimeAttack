import wordList from '../data/word-list-generated.json';

interface WordEntry {
    word: string;
    reading: string;
}

type WordListByKana = Record<string, WordEntry[]>;

export class CpuPlayer {
    private usedWords: Set<string> = new Set();
    private wordListByKana: WordListByKana = wordList as WordListByKana;

    reset() {
        this.usedWords.clear();
    }

    addUsedWord(reading: string) {
        this.usedWords.add(reading);
    }

    getNextWord(lastChar: string): string | null {
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

        return selected.word;
    }
}
