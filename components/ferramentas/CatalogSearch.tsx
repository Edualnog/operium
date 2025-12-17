"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { searchCatalogItems } from "@/lib/actions"
import { useDebounce } from "@/lib/hooks/useDebounce"

interface CatalogItem {
    id: string
    name: string
    model: string
    brand: string
    category: string
    image: string
}

interface CatalogSearchProps {
    onSelect: (item: CatalogItem) => void
}

export function CatalogSearch({ onSelect }: CatalogSearchProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [loading, setLoading] = React.useState(false)
    const [items, setItems] = React.useState<CatalogItem[]>([])
    const debouncedQuery = useDebounce(query, 300)

    React.useEffect(() => {
        async function fetchItems() {
            if (debouncedQuery.length < 2) {
                setItems([])
                return
            }
            setLoading(true)
            try {
                const results = await searchCatalogItems(debouncedQuery)
                setItems(results)
            } catch (error) {
                console.error("Failed to fetch catalog items", error)
            } finally {
                setLoading(false)
            }
        }

        fetchItems()
    }, [debouncedQuery])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-12 text-left font-normal"
                >
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Search className="h-4 w-4" />
                        {query ? query : "Buscar no Catálogo Global (Ex: Makita, Furadeira...)"}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Digite marca ou modelo..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && <div className="py-6 text-center text-sm text-muted-foreground">Buscando...</div>}

                        {!loading && items.length === 0 && query.length >= 2 && (
                            <CommandEmpty>Nenhum item encontrado no catálogo global.</CommandEmpty>
                        )}

                        {!loading && items.length > 0 && (
                            <CommandGroup heading="Sugestões do Catálogo">
                                {items.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={item.id}
                                        onSelect={() => {
                                            onSelect(item)
                                            setOpen(false)
                                            setQuery(item.name) // Keep the name in input or clear? Let's keep for context
                                        }}
                                        className="flex items-center gap-3 p-2 cursor-pointer"
                                    >
                                        <div className="h-10 w-10 bg-zinc-100 rounded flex items-center justify-center shrink-0">
                                            {item.image ? (
                                                <img src={item.image} alt="" className="h-8 w-8 object-contain" />
                                            ) : (
                                                <Package className="h-5 w-5 text-zinc-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{item.brand} {item.model}</div>
                                            <div className="text-xs text-muted-foreground">{item.name}</div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
