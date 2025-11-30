import React, { useEffect, useRef } from 'react';
import * as wanakana from 'wanakana';

interface Props {
    onSubmit: (text: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export const TypingInput: React.FC<Props> = ({ onSubmit, disabled, placeholder }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            // wanakanaをバインド（ローマ字→ひらがな自動変換）
            wanakana.bind(inputRef.current);
        }
        return () => {
            if (inputRef.current) {
                wanakana.unbind(inputRef.current);
            }
        };
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (inputRef.current) {
                const trimmed = inputRef.current.value.trim();

                // ひらがなのみをチェック
                const hiraganaOnly = /^[\u3041-\u3096]+$/;
                if (!hiraganaOnly.test(trimmed)) {
                    alert('ひらがなのみで入力してください');
                    return;
                }

                if (trimmed) {
                    onSubmit(trimmed);
                    inputRef.current.value = '';
                }
            }
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* 注意書き（目立つように上部に表示） */}
            <div className="mb-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                    <span className="text-xl">⚠️</span>
                    <div className="text-sm font-medium">
                        <div className="font-bold">IMEを「半角英数字」モードにしてください</div>
                        <div className="text-xs mt-1">
                            Windowsの場合: 「半角/全角」キーまたは「Ctrl + Space」でIMEをOFFにしてください
                        </div>
                    </div>
                </div>
            </div>

            <input
                ref={inputRef}
                type="text"
                className="w-full p-4 text-2xl border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-gray-800 shadow-sm"
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder || "ローマ字で入力してEnter"}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />

            <div className="mt-2 text-sm text-gray-500 text-center">
                ローマ字で入力すると自動でひらがなに変換されます
            </div>
        </div>
    );
};
