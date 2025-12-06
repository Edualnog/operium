"use client";

import { Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { HoverButton } from "@/components/ui/hover-button";

interface AIVoiceInputProps {
    onStart?: () => void;
    onStop?: (duration: number) => void;
    isRecording?: boolean; // Added for external control
    visualizerBars?: number;
    demoMode?: boolean;
    demoInterval?: number;
    className?: string;
}

export function AIVoiceInput({
    onStart,
    onStop,
    isRecording: externalIsRecording, // Use external control
    visualizerBars = 48,
    demoMode = false,
    demoInterval = 3000,
    className
}: AIVoiceInputProps) {
    const [submitted, setSubmitted] = useState(false);
    const [time, setTime] = useState(0);
    const [isClient, setIsClient] = useState(false);
    const [isDemo, setIsDemo] = useState(demoMode);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Sync internal state with external prop if provided
    useEffect(() => {
        if (externalIsRecording !== undefined) {
            setSubmitted(externalIsRecording);
        }
    }, [externalIsRecording]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (submitted) {
            // Only call onStart if it wasn't already recording (handled by parent usually, but good for safety)
            // But here onStart is likely just a callback for the UI interaction if we rely on internal state.
            // If controlled, parent calls start.
            // Let's assume if controlled, onStart/onStop are triggered by the CLICK, not the effect.
            // Actually, to keep it simple and compatible with the provided code's logic:
            // The effect manages the timer.
            intervalId = setInterval(() => {
                setTime((t) => t + 1);
            }, 1000);
        } else {
            setTime(0);
        }

        return () => clearInterval(intervalId);
    }, [submitted]);

    useEffect(() => {
        if (!isDemo) return;

        let timeoutId: NodeJS.Timeout;
        const runAnimation = () => {
            setSubmitted(true);
            timeoutId = setTimeout(() => {
                setSubmitted(false);
                timeoutId = setTimeout(runAnimation, 1000);
            }, demoInterval);
        };

        const initialTimeout = setTimeout(runAnimation, 100);
        return () => {
            clearTimeout(timeoutId);
            clearTimeout(initialTimeout);
        };
    }, [isDemo, demoInterval]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleClick = () => {
        if (isDemo) {
            setIsDemo(false);
            setSubmitted(false);
        } else {
            // If controlled, we just call the callbacks and let parent update the prop
            if (externalIsRecording !== undefined) {
                if (submitted) {
                    onStop?.(time);
                } else {
                    onStart?.();
                }
            } else {
                // Uncontrolled mode (original behavior)
                const newState = !submitted;
                setSubmitted(newState);
                if (newState) {
                    onStart?.();
                } else {
                    onStop?.(time);
                }
            }
        }
    };

    return (
        <div className={cn("w-full py-4", className)}>
            <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
                <HoverButton
                    onClick={handleClick}
                    className={cn(
                        "w-20 h-20 rounded-full p-0 flex items-center justify-center",
                        submitted && "outline outline-2 outline-red-500"
                    )}
                    backgroundColor={submitted ? "#ef4444" : "#111827"} // Red-500 when active
                    glowColor={submitted ? "#fca5a5" : "#00ffc3"}
                >
                    {submitted ? (
                        <div
                            className="w-6 h-6 rounded-sm animate-spin bg-white cursor-pointer pointer-events-auto"
                            style={{ animationDuration: "3s" }}
                        />
                    ) : (
                        <Mic className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                    )}
                </HoverButton>

                <span
                    className={cn(
                        "font-mono text-sm transition-opacity duration-300",
                        submitted
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-slate-400 dark:text-slate-500"
                    )}
                >
                    {formatTime(time)}
                </span>

                <div className="h-8 w-64 flex items-center justify-center gap-1">
                    {[...Array(visualizerBars)].map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-1 rounded-full transition-all duration-300",
                                submitted
                                    ? "bg-red-500/50 dark:bg-red-400/50 animate-pulse"
                                    : "bg-slate-200 dark:bg-slate-700 h-1"
                            )}
                            style={
                                submitted && isClient
                                    ? {
                                        height: `${20 + Math.random() * 80}%`,
                                        animationDelay: `${i * 0.05}s`,
                                    }
                                    : undefined
                            }
                        />
                    ))}
                </div>

                <p className="h-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {submitted ? "Ouvindo..." : "Clique para falar"}
                </p>
            </div>
        </div>
    );
}
