"use client";

import { cn } from "@/lib/utils";
import { useMotionValue, animate, motion } from "framer-motion";
import { useState, useEffect } from "react";
import useMeasure from "react-use-measure";

type InfiniteSliderProps = {
    children: React.ReactNode;
    gap?: number;
    duration?: number;
    durationOnHover?: number;
    direction?: "horizontal" | "vertical";
    reverse?: boolean;
    className?: string;
    speed?: number; // Added to match user's usage
    speedOnHover?: number; // Added to match user's usage
};

export function InfiniteSlider({
    children,
    gap = 16,
    duration = 25,
    durationOnHover,
    direction = "horizontal",
    reverse = false,
    className,
    speed,
    speedOnHover,
}: InfiniteSliderProps) {
    const [ref, { width, height }] = useMeasure();
    const translation = useMotionValue(0);
    const [isHovered, setIsHovered] = useState(false);
    const [mustFinish, setMustFinish] = useState(false);
    const [rerender, setRerender] = useState(false);

    // Map speed to duration if provided (higher speed = lower duration)
    // Base duration 25s for speed 100? Let's approximate.
    // If speed is provided, ignore duration.
    const finalDuration = speed ? 2000 / speed : duration;
    const finalDurationOnHover = speedOnHover ? 2000 / speedOnHover : durationOnHover;

    const currentDuration = isHovered && finalDurationOnHover ? finalDurationOnHover : finalDuration;

    useEffect(() => {
        let controls;
        const size = direction === "horizontal" ? width : height;
        const contentSize = size + gap;
        const from = reverse ? -contentSize / 2 : 0;
        const to = reverse ? 0 : -contentSize / 2;

        if (mustFinish) {
            controls = animate(translation, [translation.get(), to], {
                ease: "linear",
                duration: currentDuration * Math.abs((to - translation.get()) / contentSize),
                onComplete: () => {
                    setMustFinish(false);
                    setRerender(!rerender);
                },
            });
        } else {
            controls = animate(translation, [from, to], {
                ease: "linear",
                duration: currentDuration,
                repeat: Infinity,
                repeatType: "loop",
                repeatDelay: 0,
                onUpdate: (latest) => {
                    if (isHovered && !mustFinish) {
                        controls.stop();
                        setMustFinish(true);
                    }
                },
            });
        }

        return controls?.stop;
    }, [translation, width, height, gap, direction, reverse, currentDuration, isHovered, mustFinish, rerender]);

    return (
        <div
            className={cn("overflow-hidden", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.div
                className={cn("flex", direction === "horizontal" ? "flex-row" : "flex-col")}
                style={{
                    gap: `${gap}px`,
                    x: direction === "horizontal" ? translation : 0,
                    y: direction === "vertical" ? translation : 0,
                }}
                ref={ref}
            >
                {children}
                {children}
            </motion.div>
        </div>
    );
}
