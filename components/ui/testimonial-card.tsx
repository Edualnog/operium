import { cn } from "@/lib/utils"
import { Star } from "lucide-react"
import Image from "next/image"

export interface TestimonialAuthor {
    name: string
    handle: string
    avatar: string
}

export interface TestimonialCardProps {
    author: TestimonialAuthor
    text: string
    href?: string
    className?: string
    rating?: number
}

export function TestimonialCard({
    author,
    text,
    href,
    className,
    rating = 5
}: TestimonialCardProps) {
    const CardContent = (
        <div className={cn(
            "relative flex h-full w-[350px] max-w-full flex-col justify-between overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md",
            className
        )}>
            <div className="flex flex-col gap-4">
                <div className="flex gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={cn(
                                "h-4 w-4 fill-current",
                                i >= rating ? "text-muted-foreground/20 fill-none" : ""
                            )}
                        />
                    ))}
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">
                    "{text}"
                </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-muted items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                    {author.avatar ? (
                        <Image
                            src={author.avatar}
                            alt={author.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            {author.name.substring(0, 1).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{author.name}</span>
                    <span className="text-xs text-muted-foreground">{author.handle}</span>
                </div>
            </div>
        </div>
    )

    if (href) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full cursor-pointer decoration-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
            >
                {CardContent}
            </a>
        )
    }

    return CardContent
}
