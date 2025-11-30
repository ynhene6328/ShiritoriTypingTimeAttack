import fs from 'fs';
import csv from 'csv-parser';
import kuromoji from 'kuromoji';

// 設定
const INPUT_CSV = './tools/data-sources/nogizaka46_full_lyrics_dataset.csv';
const OUTPUT_JSON = './src/data/word-list-generated.json';
const DICT_PATH = './node_modules/kuromoji/dict/';

// 結果を格納する辞書
const wordsByKana = {};
const seenWords = new Set(); // 重複を避けるため

// しりとりに不適切な単語（ストップワード）
const STOPWORDS = new Set([
    'ここ', 'そこ', 'あそこ', 'どこ',
    'これ', 'それ', 'あれ', 'どれ',
    'こと', 'もの', 'ため', 'よう',
    'みたい', 'ほう', 'とき', 'とこ', 'ところ',
    'み', 'さ', 'な', 'の', 'か', 'け',
]);

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

// しりとりに適した名詞かチェック
function isValidNoun(token) {
    // 品詞が名詞でない場合は除外
    if (token.pos !== '名詞') return false;

    // 品詞細分類1でフィルタリング
    const validPosDetail1 = ['一般', '固有名詞', 'サ変接続'];
    const invalidPosDetail1 = ['非自立', '代名詞', '数', '接尾'];

    if (invalidPosDetail1.includes(token.pos_detail_1)) return false;
    if (!validPosDetail1.includes(token.pos_detail_1)) return false;

    return true;
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

    const allLyrics = [];

    // CSVを読み込む（Lyrics列のみ）
    fs.createReadStream(INPUT_CSV)
        .pipe(csv())
        .on('data', (row) => {
            const lyrics = row['Lyrics'];
            if (lyrics && lyrics.trim()) {
                allLyrics.push(lyrics.trim());
            }
        })
        .on('end', () => {
            console.log(`📝 ${allLyrics.length}個の歌詞を読み込みました`);
            console.log('🔍 形態素解析中...');

            let processedCount = 0;
            let nounCount = 0;
            let filteredCount = 0;

            // すべての歌詞を解析
            allLyrics.forEach((text, index) => {
                if (!text || text.trim() === '') return;

                const tokens = tokenizer.tokenize(text);

                tokens.forEach(token => {
                    // 品詞フィルタリング
                    if (!isValidNoun(token)) return;

                    // 読みを取得
                    let reading = token.reading;
                    if (!reading) {
                        const isKatakana = /^[ァ-ヶー]+$/.test(token.surface_form);
                        if (isKatakana) {
                            reading = token.surface_form;
                        } else {
                            return;
                        }
                    }

                    // 「ん」で終わる単語は除外
                    if (!isValidForShiritori(reading)) return;

                    // 短すぎる・長すぎる単語は除外
                    if (reading.length < 2 || reading.length > 10) return;

                    // ストップワードを除外
                    if (STOPWORDS.has(token.surface_form)) {
                        filteredCount++;
                        return;
                    }

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
                    console.log(`  処理中... ${processedCount}/${allLyrics.length}`);
                }
            });

            console.log(`✅ 形態素解析完了: ${nounCount}個の名詞を抽出`);
            console.log(`   （ストップワード除外: ${filteredCount}個）`);
            console.log('📊 統計情報:');

            // 各文字ごとの単語数を表示
            const sortedKeys = Object.keys(wordsByKana).sort();
            sortedKeys.forEach(key => {
                console.log(`  ${key}: ${wordsByKana[key].length}語`);
            });

            // JSONファイルに保存
            console.log(`💾 JSONファイルに保存中: ${OUTPUT_JSON}`);

            // ソートして保存
            const sortedResult = {};
            sortedKeys.forEach(key => {
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
