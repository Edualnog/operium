import { NextResponse } from "next/server"
import { registrarEntrada, registrarRetirada, registrarDevolucao } from "@/lib/actions"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tipo, ferramenta_id, quantidade, colaborador_id, observacoes, data } = body || {}

    if (!ferramenta_id || !quantidade || !tipo) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    if ((tipo === "retirada" || tipo === "devolucao") && !colaborador_id) {
      return NextResponse.json({ error: "Colaborador é obrigatório" }, { status: 400 })
    }

    if (tipo === "entrada") {
      await registrarEntrada(ferramenta_id, Number(quantidade), observacoes, data)
    } else if (tipo === "retirada") {
      await registrarRetirada(ferramenta_id, colaborador_id, Number(quantidade), observacoes, data)
    } else if (tipo === "devolucao") {
      await registrarDevolucao(ferramenta_id, colaborador_id, Number(quantidade), observacoes, data)
    } else {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Erro ao registrar movimentação:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}
