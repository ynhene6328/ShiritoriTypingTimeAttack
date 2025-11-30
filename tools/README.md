# 単語リスト生成ツール

このフォルダには、ゲームで使用する単語リストを生成するためのツールとデータソースが含まれています。

## フォルダ構成

```
tools/
├── data-sources/        # 単語リスト生成元のCSVファイル（.gitignore対象）
│   ├── nogizaka46_full_lyrics_dataset.csv
│   └── sakamichi_combined.csv
└── generators/          # CSVからJSONを生成するスクリプト
    ├── extract-nouns-from-csv.js
    └── extract-members-from-csv.js
```

## 使用方法

### 1. 歌詞から名詞を抽出

```bash
node tools/generators/extract-nouns-from-csv.js
```

**入力:** `tools/data-sources/nogizaka46_full_lyrics_dataset.csv`  
**出力:** `src/data/word-list-generated.json`  
**説明:** 乃木坂46の歌詞データセットから名詞を形態素解析で抽出し、しりとりに適した単語リストを生成します。

**処理内容:**
- kuromoji.jsで形態素解析
- 名詞のみを抽出
- 「ん」で終わる単語を除外
- 1文字の単語を除外
- 重複を除去

### 2. メンバー名を抽出

```bash
node tools/generators/extract-members-from-csv.js
```

**入力:** `tools/data-sources/sakamichi_combined.csv`  
**出力:** `src/data/word-list-members.json`  
**説明:** 坂道グループ（乃木坂46、日向坂46、櫻坂46）のメンバー名から単語リストを生成します。

**処理内容:**
- 「名前」列と「よみ」列から抽出
- ひらがなをカタカナに変換
- 「ん」で終わる名前を除外
- 1文字の名前を除外
- 重複を除去

## データソースについて

`tools/data-sources/` 内のCSVファイルは、以下の理由で.gitignore対象です：
- 著作権上の配慮
- ファイルサイズが大きい
- 生成されたJSON（`src/data/`）のみをリポジトリに含める

## 出力ファイル形式

生成されるJSONファイルはすべて同じ形式です：

```json
{
  "ア": [
    { "word": "愛", "reading": "アイ" },
    { "word": "相手", "reading": "アイテ" }
  ],
  "サ": [
    { "word": "齋藤飛鳥", "reading": "サイトウ アスカ" },
    { "word": "桜井玲香", "reading": "サクライ レイカ" }
  ]
}
```

## アプリケーションでの使用

`src/logic/cpu.ts` が複数のJSONファイルを自動的に結合して読み込みます：

```typescript
import lyricsWordList from '../data/word-list-generated.json';
import membersWordList from '../data/word-list-members.json';

// コンストラクタで自動的に結合
constructor() {
  this.wordListByKana = this.mergeWordLists([
    lyricsWordList,
    membersWordList
  ]);
}
```

新しいデータソースを追加する場合：
1. `tools/generators/` に新しい抽出スクリプトを作成
2. `src/data/` に出力
3. `src/logic/cpu.ts` のインポートと配列に追加
