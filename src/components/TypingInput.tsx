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
            if (inputRef.current && inputRef.current.value.trim()) {
                onSubmit(inputRef.current.value.trim());
                inputRef.current.value = '';
            }
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <input
                ref={inputRef}
                type="text"
                className="w-full p-4 text-2xl border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-gray-800 shadow-sm"
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder || "ここに入力してEnter"}
                autoFocus
            />
            <div className="mt-2 text-sm text-gray-500 text-center">
                ローマ字で入力すると自動でひらがなに変換されます
            </div>
        </div>
    );
};
