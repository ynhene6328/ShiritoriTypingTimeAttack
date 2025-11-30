import kuromoji from 'kuromoji';

export interface ShiritoriResult {
    isValid: boolean;
    message?: string;
    reading?: string;
    lastChar?: string;
}

export class ShiritoriManager {
    private tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures> | null = null;
    private usedWords: Set<string> = new Set();

    async init(dicPath: string = 'dict/'): Promise<void> {
        return new Promise((resolve, reject) => {
            kuromoji.builder({ dicPath }).build((err, tokenizer) => {
                if (err) {
                    reject(err);
                } else {
                    this.tokenizer = tokenizer;
                    resolve();
                }
            });
        });
    }

    reset() {
        this.usedWords.clear();
    }

    validate(word: string, previousLastChar: string | null): ShiritoriResult {
        if (!this.tokenizer) {
            return { isValid: false, message: '辞書がロードされていません' };
        }

        if (this.usedWords.has(word)) {
            return { isValid: false, message: 'すでに使われた単語です' };
        }

        const path = this.tokenizer.tokenize(word);
        if (path.length === 0) {
            return { isValid: false, message: '単語として認識されませんでした' };
        }

        // 読み仮名を取得 (カタカナ)
        let reading = '';
        for (const token of path) {
            // 読みがない場合のフォールバック処理
            // カタカナ単語の場合、元の文字列をそのまま使う
            if (!token.reading) {
                // カタカナかどうかチェック
                const isKatakana = /^[ァ-ヶー]+$/.test(token.surface_form);
                if (isKatakana) {
                    reading += token.surface_form;
                } else {
                    return { isValid: false, message: '辞書にない単語、または読み方が不明です' };
                }
            } else {
                reading += token.reading;
            }
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

        // this.usedWords.add(word); // ここでの登録は削除し、呼び出し元で明示的に行う
        return { isValid: true, reading, lastChar };
    }

    addUsedWord(word: string) {
        this.usedWords.add(word);
    }

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
        if (last === 'ー' && reading.length > 1) {
            last = reading.slice(-2, -1);
        }
        return this.normalize(last);
    }
}
