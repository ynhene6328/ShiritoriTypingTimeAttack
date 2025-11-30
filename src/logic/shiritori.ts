export interface ShiritoriResult {
    isValid: boolean;
    message?: string;
    reading?: string;
    lastChar?: string;
}

export class ShiritoriManager {
    private usedWords: Set<string> = new Set();

    // 初期化処理は不要になったが、インターフェース互換性のために残す（即解決）
    async init(_dicPath: string = 'dict/'): Promise<void> {
        return Promise.resolve();
    }

    reset() {
        this.usedWords.clear();
    }

    /**
     * しりとりルールを検証する
     * @param reading カタカナの読み
     * @param previousLastChar 前の単語の最後の文字
     */
    validate(reading: string, previousLastChar: string | null): ShiritoriResult {
        // 使用済みチェック
        // 注意: ここではチェックのみ行い、登録はしない
        if (this.usedWords.has(reading)) {
            return { isValid: false, message: 'すでに使われた単語です' };
        }

        // 最後の文字判定
        const lastChar = this.getLastChar(reading);
        if (lastChar === 'ン') {
            return { isValid: false, message: '「ん」で終わっています', reading, lastChar };
        }

        // 最初の文字判定
        if (previousLastChar) {
            const firstChar = this.normalize(reading.slice(0, 1));
            if (firstChar !== previousLastChar) {
                return { isValid: false, message: `「${previousLastChar}」から始まっていません`, reading, lastChar };
            }
        }

        return { isValid: true, reading, lastChar };
    }

    addUsedWord(reading: string) {
        this.usedWords.add(reading);
    }

    // 文字の正規化（小文字→大文字）
    private normalize(char: string): string {
        const map: { [key: string]: string } = {
            'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
            'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ',
            'ヮ': 'ワ', 'ヵ': 'カ', 'ヶ': 'ケ',
        };

        return map[char] || char;
    }

    // 長音対応版の lastChar 取得
    getLastChar(reading: string): string {
        let last = reading.slice(-1);
        const choon = ['ー', '−', '―', '-'];
        if (choon.includes(last) && reading.length > 1) {
            last = reading.slice(-2, -1);
        }
        return this.normalize(last);
    }
}
