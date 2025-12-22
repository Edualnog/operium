export function safeArray(data: any): any[] {
    if (!data) return []
    if (Array.isArray(data)) return data
    return []
}
