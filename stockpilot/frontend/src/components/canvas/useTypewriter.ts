import { useEffect, useState } from "react";

export function useTypewriter(words: string[], typingSpeed = 160, pauseMs = 2200, deletingSpeed = 80) {
    const [displayText, setDisplayText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentWord = words[wordIndex % words.length];

        if (isDeleting && displayText === "") {
            setIsDeleting(false);
            setWordIndex((prev) => prev + 1);
            return;
        }

        if (!isDeleting && displayText === currentWord) {
            const timeout = window.setTimeout(() => setIsDeleting(true), pauseMs);
            return () => window.clearTimeout(timeout);
        }

        const timer = window.setTimeout(() => {
            setDisplayText((prev) =>
                isDeleting
                    ? currentWord.substring(0, Math.max(0, prev.length - 1))
                    : currentWord.substring(0, Math.min(currentWord.length, prev.length + 1))
            );
        }, isDeleting ? deletingSpeed : typingSpeed);

        return () => window.clearTimeout(timer);
    }, [deletingSpeed, displayText, isDeleting, pauseMs, typingSpeed, wordIndex, words]);

    return displayText;
}
