import React, { useEffect, useState, useRef } from 'react';
import { ShiritoriManager } from '../logic/shiritori';
import { CpuPlayer } from '../logic/cpu';
import { TypingInput } from './TypingInput';

export const GameScreen: React.FC = () => {
    const [manager] = useState(() => new ShiritoriManager());
    const [cpu] = useState(() => new CpuPlayer());

    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [history, setHistory] = useState<{ word: string, reading: string, owner: 'user' | 'cpu' }[]>([]);
    const [message, setMessage] = useState('辞書を読み込んでいます...');
    const [lastChar, setLastChar] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(60);
    const [score, setScore] = useState(0);

    const timerRef = useRef<number | undefined>(undefined);
    const historyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        manager.init().then(() => {
            setIsReady(true);
            setMessage('準備完了！');
        }).catch(err => {
            console.error(err);
            setMessage(`辞書の読み込みに失敗しました: ${err.message || JSON.stringify(err)}`);
        });
    }, [manager]);

    // 履歴が更新されたら自動的に最下部にスクロール
    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [history]);

    const startGame = () => {
        manager.reset();
        cpu.reset();
        setHistory([]);
        setLastChar(null);
        setScore(0);
        setTimeLeft(60);
        setIsPlaying(true);
        setMessage('スタート！好きな単語を入力してください');

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const endGame = () => {
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setMessage(`タイムアップ！ スコア: ${score}回`);
    };

    const handleUserSubmit = (text: string) => {
        if (!isPlaying) return;

        // ユーザーのターン
        const result = manager.validate(text, lastChar);
        if (!result.isValid) {
            setMessage(`エラー: ${result.message}`);
            return;
        }

        // 読みから単語リストを検索（単語リストに存在する表記を優先）
        const wordEntry = cpu.findWordByReading(result.reading!);
        const displayWord = wordEntry ? wordEntry.word : text;

        // OKなら履歴に追加（読みを含む）
        const newHistory = [...history, {
            word: displayWord,
            reading: result.reading!,
            owner: 'user' as const
        }];
        setHistory(newHistory);
        setScore(prev => prev + 1);

        const nextLastChar = result.lastChar!;
        setLastChar(nextLastChar);

        // ユーザーの単語をCPUに通知（重複防止）
        cpu.addUsedWord(result.reading!);

        // CPUのターン
        setTimeout(() => {
            if (!isPlaying) return;

            // CPUの単語選択をリトライするロジック
            const maxRetries = 5;
            let cpuEntry: { word: string; reading: string } | null = null;
            let cpuResult = null;
            const retryHistory: { attempt: number, word: string | null, isValid: boolean, reason?: string }[] = [];

            for (let i = 0; i < maxRetries; i++) {
                cpuEntry = cpu.getNextWord(nextLastChar);

                if (!cpuEntry) {
                    // 候補がない場合
                    retryHistory.push({ attempt: i + 1, word: null, isValid: false, reason: '候補なし' });
                    console.group(`🔴 CPU失敗: 候補が見つかりません (「${nextLastChar}」から)`);
                    console.table(retryHistory);
                    console.groupEnd();
                    setMessage('CPU: 思いつきません... 好きな単語からどうぞ！');
                    setLastChar(null);
                    return;
                }

                // 選んだ単語を検証
                cpuResult = manager.validate(cpuEntry.word, nextLastChar);

                if (cpuResult.isValid) {
                    // 有効な単語が見つかった
                    retryHistory.push({ attempt: i + 1, word: cpuEntry.word, isValid: true });
                    if (i > 0) {
                        // リトライして成功した場合のみログ出力
                        console.group(`✅ CPU成功: ${i + 1}回目の試行で有効な単語を発見`);
                        console.table(retryHistory);
                        console.groupEnd();
                    }
                    break;
                } else {
                    // 無効な単語だった場合、履歴に記録して次を試す
                    retryHistory.push({ attempt: i + 1, word: cpuEntry.word, isValid: false, reason: cpuResult.message });
                    console.warn(`⚠️ CPU retry ${i + 1}/${maxRetries}: "${cpuEntry.word}" → ${cpuResult.message}`);
                    cpuEntry = null;
                    cpuResult = null;
                }
            }

            // 最大リトライ後も有効な単語が見つからなかった場合
            if (!cpuEntry || !cpuResult || !cpuResult.isValid) {
                console.group(`🔴 CPU失敗: ${maxRetries}回の試行後も有効な単語が見つかりませんでした`);
                console.log(`次の文字: 「${nextLastChar}」`);
                console.table(retryHistory);
                console.groupEnd();
                setMessage('CPU: 思いつきません... 好きな単語からどうぞ！');
                setLastChar(null);
                return;
            }

            // 有効な単語が見つかったので、ゲームを続行（読みを含む）
            setHistory([...newHistory, {
                word: cpuEntry.word,
                reading: cpuEntry.reading,
                owner: 'cpu' as const
            }]);
            setLastChar(cpuResult.lastChar!);
            setMessage(`CPU: ${cpuEntry.word}`);
        }, 500);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans text-gray-800">
            <h1 className="text-4xl font-bold mb-8 text-blue-600">しりとりタイピング TA</h1>

            <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="text-xl font-bold">残り時間: <span className="text-red-500 text-3xl">{timeLeft}</span> 秒</div>
                    <div className="text-xl font-bold">スコア: <span className="text-green-500 text-3xl">{score}</span> 回</div>
                </div>

                <div
                    ref={historyRef}
                    className="mb-6 h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col"
                >
                    {history.length === 0 && <div className="text-center text-gray-400 mt-10">履歴はここに表示されます</div>}
                    {history.map((item, index) => (
                        <div key={index} className={`mb-2 flex ${item.owner === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`px-4 py-2 rounded-lg max-w-xs ${item.owner === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                <div className="font-semibold">{item.word}</div>
                                <div className="text-xs opacity-75 mt-1">（{item.reading}）</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mb-4 text-center text-lg font-medium text-purple-600 min-h-[1.5em]">
                    {message}
                </div>

                {!isPlaying ? (
                    <div className="text-center">
                        <button
                            onClick={startGame}
                            disabled={!isReady}
                            className={`px-8 py-3 rounded-full text-xl font-bold text-white transition-all transform hover:scale-105 ${isReady ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                            {isReady ? (score > 0 ? 'もう一度遊ぶ' : 'ゲームスタート') : '準備中...'}
                        </button>
                    </div>
                ) : (
                    <TypingInput onSubmit={handleUserSubmit} />
                )}

                {isPlaying && lastChar && (
                    <div className="mt-4 text-center text-gray-500">
                        次は「<span className="font-bold text-2xl text-blue-600 mx-1">{lastChar}</span>」から始まる単語
                    </div>
                )}
            </div>
        </div>
    );
};
