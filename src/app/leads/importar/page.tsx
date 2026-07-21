"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "../../../components/Toast";
import {
  detectarMapeamento,
  paraNumero,
  paraTexto,
  ROTULO_CAMPO,
  type CampoAlvo,
} from "../../../lib/deteccaoColunas";

const CAMPOS: CampoAlvo[] = [
  "nome",
  "telefone",
  "email",
  "empresa",
  "cnpj",
  "produtoInteresse",
  "valorEstimado",
  "observacao",
];

const TAMANHO_LOTE = 500;

type LinhaPayload = {
  nome?: string;
  telefone?: string;
  email?: string;
  produtoInteresse?: string;
  valorEstimado?: number;
  observacao?: string;
};

type ResultadoImportacao = { criados: number; ignorados: number; erros: { linha: number; motivo: string }[] };

export default function PaginaImportarLeads() {
  const { mostrarToast } = useToast();

  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<unknown[][]>([]);
  const [mapeamento, setMapeamento] = useState<Record<CampoAlvo, number>>({} as Record<CampoAlvo, number>);
  const [lendo, setLendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

  async function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setLendo(true);
    setResultado(null);
    try {
      const XLSX = await import("xlsx");
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const primeiraAba = workbook.Sheets[workbook.SheetNames[0]];
      const bruto = XLSX.utils.sheet_to_json<unknown[]>(primeiraAba, { header: 1, defval: "" });

      const [linhaCabecalho, ...linhasDados] = bruto;
      const cabecalhosTexto = (linhaCabecalho ?? []).map((c) => String(c ?? "").trim());
      const linhasValidas = linhasDados.filter((linha) =>
        linha.some((celula) => String(celula ?? "").trim() !== "")
      );

      setNomeArquivo(arquivo.name);
      setCabecalhos(cabecalhosTexto);
      setLinhas(linhasValidas);
      setMapeamento(detectarMapeamento(cabecalhosTexto));
    } catch {
      mostrarToast("Não foi possível ler essa planilha. Confira se é um .xlsx, .xls ou .csv válido.", "erro");
      setNomeArquivo(null);
      setCabecalhos([]);
      setLinhas([]);
    } finally {
      setLendo(false);
      e.target.value = "";
    }
  }

  function montarLinha(linha: unknown[]): LinhaPayload | null {
    const pegar = (campo: CampoAlvo) => {
      const indice = mapeamento[campo];
      return indice === undefined || indice === -1 ? undefined : linha[indice];
    };

    const nome = paraTexto(pegar("nome"));
    const telefone = paraTexto(pegar("telefone"));
    const email = paraTexto(pegar("email"));
    if (!nome && !telefone && !email) return null;

    const empresa = paraTexto(pegar("empresa"));
    const cnpj = paraTexto(pegar("cnpj"));
    const observacaoOriginal = paraTexto(pegar("observacao"));

    const notas = [
      empresa ? `Empresa: ${empresa}` : null,
      cnpj ? `CNPJ/CPF: ${cnpj}` : null,
      observacaoOriginal,
    ].filter(Boolean);

    return {
      nome,
      telefone,
      email,
      produtoInteresse: paraTexto(pegar("produtoInteresse")),
      valorEstimado: paraNumero(pegar("valorEstimado")),
      observacao: notas.length > 0 ? notas.join(" · ") : undefined,
    };
  }

  const linhasMapeadas = linhas.map(montarLinha).filter((l): l is LinhaPayload => l !== null);

  async function importar() {
    if (linhasMapeadas.length === 0) return;

    setEnviando(true);
    setResultado(null);

    const lotes: LinhaPayload[][] = [];
    for (let i = 0; i < linhasMapeadas.length; i += TAMANHO_LOTE) {
      lotes.push(linhasMapeadas.slice(i, i + TAMANHO_LOTE));
    }

    const acumulado: ResultadoImportacao = { criados: 0, ignorados: 0, erros: [] };
    setProgresso({ atual: 0, total: lotes.length });

    for (let i = 0; i < lotes.length; i++) {
      try {
        const resp = await fetch("/api/leads/importar-lote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linhas: lotes[i] }),
        });
        const dados = await resp.json();
        if (resp.ok) {
          acumulado.criados += dados.criados;
          acumulado.ignorados += dados.ignorados;
          acumulado.erros.push(
            ...dados.erros.map((e: { linha: number; motivo: string }) => ({
              ...e,
              linha: e.linha + i * TAMANHO_LOTE,
            }))
          );
        } else {
          acumulado.ignorados += lotes[i].length;
        }
      } catch {
        acumulado.ignorados += lotes[i].length;
      }
      setProgresso({ atual: i + 1, total: lotes.length });
    }

    setResultado(acumulado);
    setEnviando(false);
    setProgresso(null);
    mostrarToast(
      acumulado.ignorados === 0
        ? `${acumulado.criados} leads importados.`
        : `${acumulado.criados} leads importados, ${acumulado.ignorados} ignorados.`,
      acumulado.ignorados === 0 ? "sucesso" : "erro"
    );
  }

  return (
    <div className="entrar-suave" style={{ background: "var(--bg)", minHeight: "100vh", padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <Link href="/negociacoes" className="botao-secundario" style={{ marginBottom: 18, border: "none", padding: "4px 0", background: "none", display: "inline-block" }}>
        ← Voltar para negociações
      </Link>

      <header style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          Importar leads de uma planilha
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "6px 0 0" }}>
          Envie um arquivo .xlsx, .xls ou .csv. O sistema tenta identificar as colunas automaticamente — confira o mapeamento antes de importar.
        </p>
      </header>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: 18,
          marginBottom: 20,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <label
          className="botao-primario"
          style={{ display: "inline-block", cursor: lendo ? "default" : "pointer", opacity: lendo ? 0.6 : 1 }}
        >
          {lendo ? "Lendo…" : "Escolher planilha"}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={lerArquivo} disabled={lendo} style={{ display: "none" }} />
        </label>
        {nomeArquivo && (
          <span style={{ marginLeft: 12, fontSize: 13, color: "var(--ink-muted)" }}>
            {nomeArquivo} · {linhas.length} linha{linhas.length !== 1 ? "s" : ""} encontrada{linhas.length !== 1 ? "s" : ""}
          </span>
        )}
      </section>

      {cabecalhos.length > 0 && (
        <>
          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 18,
              marginBottom: 20,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: 0 }}>
              Mapeamento de colunas
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {CAMPOS.map((campo) => (
                <label key={campo} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {ROTULO_CAMPO[campo]}
                    {campo === "nome" || campo === "telefone" || campo === "email" ? "" : " (opcional)"}
                  </span>
                  <select
                    value={mapeamento[campo] ?? -1}
                    onChange={(e) =>
                      setMapeamento((atual) => ({ ...atual, [campo]: Number(e.target.value) }))
                    }
                    className="campo-input"
                  >
                    <option value={-1}>— não usar —</option>
                    {cabecalhos.map((c, i) => (
                      <option key={i} value={i}>
                        {c || `Coluna ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
              Ao menos nome, telefone ou e-mail precisa estar mapeado — linhas sem nenhum desses três são ignoradas. Empresa e CNPJ/CPF entram como anotação no lead.
            </p>
          </section>

          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 18,
              marginBottom: 20,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: "0 0 10px" }}>
              Prévia ({linhasMapeadas.length} de {linhas.length} linhas serão importadas)
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--ink-muted)", fontSize: 11, textTransform: "uppercase" }}>
                    <th style={{ padding: "4px 8px" }}>Nome</th>
                    <th style={{ padding: "4px 8px" }}>Telefone</th>
                    <th style={{ padding: "4px 8px" }}>E-mail</th>
                    <th style={{ padding: "4px 8px" }}>Produto</th>
                    <th style={{ padding: "4px 8px" }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasMapeadas.slice(0, 5).map((l, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 8px" }}>{l.nome ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{l.telefone ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{l.email ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{l.produtoInteresse ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{l.valorEstimado ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <button
            onClick={importar}
            disabled={enviando || linhasMapeadas.length === 0}
            className="botao-primario"
          >
            {enviando
              ? progresso
                ? `Importando… (${progresso.atual}/${progresso.total})`
                : "Importando…"
              : `Importar ${linhasMapeadas.length} lead${linhasMapeadas.length !== 1 ? "s" : ""}`}
          </button>
        </>
      )}

      {resultado && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            marginTop: 20,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h2 style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, color: "var(--ink-muted)", margin: "0 0 10px" }}>
            Resultado
          </h2>
          <p style={{ fontSize: 14, margin: 0 }}>
            {resultado.criados} lead{resultado.criados !== 1 ? "s" : ""} criado{resultado.criados !== 1 ? "s" : ""}
            {resultado.ignorados > 0 && `, ${resultado.ignorados} ignorado${resultado.ignorados !== 1 ? "s" : ""}`}.
          </p>
          {resultado.erros.length > 0 && (
            <ul style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 10, paddingLeft: 18 }}>
              {resultado.erros.slice(0, 10).map((e, i) => (
                <li key={i}>
                  Linha {e.linha}: {e.motivo}
                </li>
              ))}
              {resultado.erros.length > 10 && <li>e mais {resultado.erros.length - 10}…</li>}
            </ul>
          )}
          <Link href="/negociacoes" className="botao-primario" style={{ marginTop: 14, display: "inline-block", textDecoration: "none" }}>
            Ver negociações
          </Link>
        </section>
      )}
    </div>
  );
}
