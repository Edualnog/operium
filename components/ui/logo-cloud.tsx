"use client";

import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";
import Image from "next/image";

type Logo = {
    src: string;
    alt: string;
    width?: number;
    height?: number;
};

type LogoCloudProps = React.ComponentProps<"div"> & {
    logos: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
    return (
        <div
            {...props}
            className={cn(
                "overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]",
                className
            )}
        >
            <InfiniteSlider gap={42} reverse speed={80} speedOnHover={25}>
                {logos.map((logo) => (
                    <Image
                        alt={logo.alt}
                        className="pointer-events-none h-8 select-none md:h-10 dark:brightness-0 dark:invert opacity-70 hover:opacity-100 transition-opacity w-auto"
                        height={logo.height || 40}
                        key={`logo-${logo.alt}`}
                        src={logo.src}
                        width={logo.width || 100}
                        unoptimized
                    />
                ))}
            </InfiniteSlider>
        </div>
    );
}
