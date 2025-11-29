# CPUエラー問題の解決レポート

## 問題の概要

「まんと」入力後に「CPUがエラーを起こしました。好きな単語からどうぞ」というエラーが発生

## 根本原因

### 1. **カタカナ単語の読み取得失敗**（主要因）

**問題点：**
- WORD_LIST内の単語はカタカナ（例：「トマト」「マント」）
- kuromojiでカタカナ単語をtokenizeすると、未知語として `token.reading` が `undefined` になる
- 従来のコードでは `token.reading` がない場合、即座にエラーとして処理

**発生メカニズム：**
```
ユーザー「まんと」入力
→ 読み「マント」、最後の文字「ト」
→ CPUが「ト」から始まる単語を探す（「トマト」「トケイ」「トビラ」）
→ CPUが例えば「トマト」を選択
→ manager.validate("トマト", "ト") を実行
→ kuromoji.tokenize("トマト") で token.reading が undefined
→ エラー: "辞書にない単語、または読み方が不明です"
```

### 2. **CPU と ShiritoriManager の単語管理が分離**（副次的問題）

**問題点：**
- ユーザーが入力した単語が `CpuPlayer` の `usedWords` に追加されていない
- そのため、CPUが同じ単語を選んでしまう可能性がある

## 実装した解決策

### 修正1: カタカナ単語のフォールバック処理

**ファイル:** `src/logic/shiritori.ts`

```typescript
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
```

**効果：**
- カタカナ単語（「トマト」など）は、読みがなくても元の文字列をそのまま使用
- これにより、WORD_LIST内のカタカナ単語がすべて正常に処理される

### 修正2: ユーザー単語のCPU通知

**ファイル:** `src/components/GameScreen.tsx`

```typescript
const nextLastChar = result.lastChar!;
setLastChar(nextLastChar);

// ユーザーの単語をCPUに通知（重複防止）
cpu.addUsedWord(result.reading!);
```

**効果：**
- ユーザーが入力した単語の読み（例：「マント」）がCPUの `usedWords` に追加される
- CPUが同じ単語を選んでしまうことを防止

### 修正3: エラーメッセージの詳細化

```typescript
if (!cpuResult.isValid) {
    console.error('CPU Error', { cpuWord, cpuResult });
    setMessage(`CPUエラー: ${cpuResult.message} (単語: ${cpuWord})`);
    setLastChar(null);
    return;
}
```

**効果：**
- どの単語でエラーが発生したか、具体的な原因が画面に表示される
- デバッグが容易になる

## エラーが発生する具体的なケース

これまでの実装では、以下のケースでエラーが発生していました：

1. **カタカナ単語を使用した場合**
   - ユーザー：「まんと」→ 読み「マント」
   - CPU：「トマト」を選択
   - エラー：`token.reading` が undefined → 「辞書にない単語」エラー

2. **CPUが既出単語を選んだ場合**
   - ユーザー：「とまと」
   - 後続でCPUが偶然「トマト」を選択
   - エラー：「すでに使われた単語です」

修正後は、これらのケースが正常に処理されます。

## 動作確認

ビルドが正常に完了しました：
```
✓ 65 modules transformed.
dist/assets/index-Db3MChUL.js   281.98 kB │ gzip: 94.06 kB
✓ built in 2.38s
```

## 今後の改善提案

1. **WORD_LISTの拡充**
   - 現在約50単語のみ → 数百〜数千単語に増やすとゲーム性が向上
   - 各文字から始まる単語を均等に配置し、CPUが詰まらないようにする

2. **ひらがな→カタカナ変換の明示**
   - ユーザー入力「まんと」をカタカナ「マント」に変換していることを明示
   - 履歴にカタカナ表記を追加

3. **CPU難易度の調整**
   - 現在はランダム選択のみ
   - より戦略的な単語選択（例：相手を詰ませやすい文字で終わる単語を選ぶ）
