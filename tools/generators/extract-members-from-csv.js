import fs from 'fs';
import csv from 'csv-parser';

// 設定
const INPUT_CSV = './tools/data-sources/sakamichi_combined.csv';
const OUTPUT_JSON = './src/data/word-list-members.json';

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

// ひらがなをカタカナに変換
function hiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, char => 
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

console.log('📖 CSVファイルを読み込んでいます:', INPUT_CSV);

let memberCount = 0;
let validMemberCount = 0;

fs.createReadStream(INPUT_CSV)
  .pipe(csv())
  .on('data', (row) => {
    const name = row['名前'];
    const yomi = row['よみ'];

    if (!name || !yomi) return;

    memberCount++;

    // よみをカタカナに変換
    const reading = hiraganaToKatakana(yomi.trim());

    // 「ん」で終わる場合は除外
    if (!isValidForShiritori(reading)) {
      console.log(`  ⚠️  除外: ${name} (${reading}) - 「ん」で終わる`);
      return;
    }

    // 短すぎる（1文字）は除外
    if (reading.length < 2) {
      console.log(`  ⚠️  除外: ${name} (${reading}) - 1文字のみ`);
      return;
    }

    // 重複チェック
    const wordKey = `${name}:${reading}`;
    if (seenWords.has(wordKey)) return;
    seenWords.add(wordKey);

    // 先頭文字を取得
    const firstChar = normalizeFirstChar(reading[0]);

    // 辞書に追加
    if (!wordsByKana[firstChar]) {
      wordsByKana[firstChar] = [];
    }

    wordsByKana[firstChar].push({
      word: name,
      reading: reading
    });

    validMemberCount++;
  })
  .on('end', () => {
    console.log(`\n✅ 読み込み完了`);
    console.log(`📊 統計:`);
    console.log(`  総メンバー数: ${memberCount}`);
    console.log(`  有効メンバー数: ${validMemberCount}`);
    console.log(`  除外数: ${memberCount - validMemberCount}`);
    console.log('\n📊 先頭文字別単語数:');

    // 各文字ごとの単語数を表示
    const sortedKeys = Object.keys(wordsByKana).sort();
    sortedKeys.forEach(key => {
      console.log(`  ${key}: ${wordsByKana[key].length}名`);
    });

    // JSONファイルに保存
    console.log(`\n💾 JSONファイルに保存中: ${OUTPUT_JSON}`);

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
    console.log(`📊 総単語数: ${validMemberCount}名`);
    console.log(`📊 ユニークな先頭文字数: ${sortedKeys.length}文字`);
  });
