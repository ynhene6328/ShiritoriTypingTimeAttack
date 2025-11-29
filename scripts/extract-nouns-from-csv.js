import fs from 'fs';
import csv from 'csv-parser';
import kuromoji from 'kuromoji';

// 設定
const INPUT_CSV = './nogizaka46_full_lyrics_dataset.csv';
const OUTPUT_JSON = './src/data/word-list-generated.json';
const DICT_PATH = './node_modules/kuromoji/dict/';

// 結果を格納する辞書
const wordsByKana = {};
const seenWords = new Set(); // 重複を避けるため

// 先頭文字の正規化（小文字カタカナを大文字に）
function normalizeFirstChar(char) {
    const map = {
        'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ',
        'ッ': 'ツ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ',
        'ヮ': 'ワ', 'ヵ': 'カ', 'ヶ': 'ケ'
    };
    return map[char] || char;
}

// 長音記号で終わる場合の処理
function getLastChar(reading) {
    let last = reading.slice(-1);
    if (last === 'ー' && reading.length > 1) {
        last = reading.slice(-2, -1);
    }
    return normalizeFirstChar(last);
}

// 「ん」で終わる単語を除外
function isValidForShiritori(reading) {
    const lastChar = getLastChar(reading);
    return lastChar !== 'ン';
}

// kuromoji初期化
console.log('📚 kuromoji辞書を読み込んでいます...');
kuromoji.builder({ dicPath: DICT_PATH }).build((err, tokenizer) => {
    if (err) {
        console.error('❌ 辞書の読み込みに失敗しました:', err);
        return;
    }

    console.log('✅ 辞書の読み込み完了');
    console.log(`📖 CSVファイルを読み込んでいます: ${INPUT_CSV}`);

    const allTexts = [];

    // CSVを読み込む
    fs.createReadStream(INPUT_CSV)
        .pipe(csv())
        .on('data', (row) => {
            // URL列以外のすべての値を結合
            const textParts = Object.entries(row)
                .filter(([key]) => !key.toLowerCase().includes('url')) // URL列を除外
                .map(([, value]) => value)
                .filter(value => value && value.trim());

            allTexts.push(...textParts);
        })
        .on('end', () => {
            console.log(`📝 ${allTexts.length}個のテキストを読み込みました`);
            console.log('🔍 形態素解析中...');

            let processedCount = 0;
            let nounCount = 0;

            // すべてのテキストを解析
            allTexts.forEach((text, index) => {
                if (!text || text.trim() === '') return;

                const tokens = tokenizer.tokenize(text);

                tokens.forEach(token => {
                    // 名詞のみを抽出
                    if (token.pos !== '名詞') return;

                    // 読みを取得（カタカナまたは表層形）
                    let reading = token.reading;
                    if (!reading) {
                        // カタカナの場合、そのまま使用
                        const isKatakana = /^[ァ-ヶー]+$/.test(token.surface_form);
                        if (isKatakana) {
                            reading = token.surface_form;
                        } else {
                            return; // 読みが取得できない場合はスキップ
                        }
                    }

                    // 「ん」で終わる単語は除外
                    if (!isValidForShiritori(reading)) return;

                    // 短すぎる単語は除外（1文字のみ）
                    if (reading.length < 2) return;

                    // 重複チェック
                    const wordKey = `${token.surface_form}:${reading}`;
                    if (seenWords.has(wordKey)) return;
                    seenWords.add(wordKey);

                    // 先頭文字を取得
                    const firstChar = normalizeFirstChar(reading[0]);

                    // 辞書に追加
                    if (!wordsByKana[firstChar]) {
                        wordsByKana[firstChar] = [];
                    }

                    wordsByKana[firstChar].push({
                        word: token.surface_form,
                        reading: reading
                    });

                    nounCount++;
                });

                processedCount++;
                if (processedCount % 100 === 0) {
                    console.log(`  処理中... ${processedCount}/${allTexts.length}`);
                }
            });

            console.log(`✅ 形態素解析完了: ${nounCount}個の名詞を抽出`);
            console.log('📊 統計情報:');

            // 各文字ごとの単語数を表示
            const sortedKeys = Object.keys(wordsByKana).sort();
            sortedKeys.forEach(key => {
                console.log(`  ${key}: ${wordsByKana[key].length}語`);
            });

            // JSONファイルに保存
            console.log(`💾 JSONファイルに保存中: ${OUTPUT_JSON}`);

            // ソートして保存（読みやすくするため）
            const sortedResult = {};
            sortedKeys.forEach(key => {
                // 各グループ内でも読みでソート
                sortedResult[key] = wordsByKana[key].sort((a, b) =>
                    a.reading.localeCompare(b.reading)
                );
            });

            fs.writeFileSync(
                OUTPUT_JSON,
                JSON.stringify(sortedResult, null, 2),
                'utf-8'
            );

            console.log('✅ 完了！');
            console.log(`📁 出力ファイル: ${OUTPUT_JSON}`);
            console.log(`📊 総単語数: ${nounCount}語`);
            console.log(`📊 ユニークな先頭文字数: ${sortedKeys.length}文字`);
        });
});
