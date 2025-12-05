import assert from "node:assert/strict"
import { test } from "node:test"
import { validateFile } from "../app/api/upload-photo/helpers"

// Mock File object since it's not available in Node.js environment by default
class MockFile {
    name: string
    type: string
    size: number

    constructor(name: string, type: string, size: number) {
        this.name = name
        this.type = type
        this.size = size
    }
}

// Cast to any to bypass type checking for test purposes
const createFile = (name: string, type: string, size: number) => new MockFile(name, type, size) as any as File

test("validateFile aceita arquivo válido", () => {
    const file = createFile("foto.jpg", "image/jpeg", 1024 * 1024) // 1MB
    const result = validateFile(file)
    assert.equal(result.valid, true)
})

test("validateFile rejeita arquivo ausente", () => {
    const result = validateFile(null)
    assert.equal(result.valid, false)
    assert.equal(result.error, "fileMissing")
})

test("validateFile rejeita tipo inválido", () => {
    const file = createFile("doc.pdf", "application/pdf", 1024)
    const result = validateFile(file)
    assert.equal(result.valid, false)
    assert.equal(result.error, "typeError")
})

test("validateFile rejeita arquivo muito grande", () => {
    const file = createFile("large.jpg", "image/jpeg", 6 * 1024 * 1024) // 6MB
    const result = validateFile(file)
    assert.equal(result.valid, false)
    assert.equal(result.error, "sizeError")
})
