"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { UploadCloud, FileSpreadsheet, ChevronDown, ChevronUp, AlertCircle, Printer, Download, User, FileText, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interfaces
interface RawDataEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface DonorEntry {
  NUM_RECIBO: number;
  NOME: string;
  DOCUMENTO: string;
  originalDocumento: string;
  totalDoado: number;
  doacoes: RawDataEntry[];
}

// Helpers
const applyDocumentMask = (doc: string) => {
  if (!doc) return "";
  const numeric = doc.toString().replace(/\D/g, "");

  // Decide se é CPF (até 11 dígitos) ou CNPJ (até 14 dígitos)
  if (numeric.length <= 11) {
    const padded = numeric.padStart(11, "0");
    return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else {
    // Para CNPJ, estende até 14 dígitos com zeros à esquerda
    const padded = numeric.padStart(14, "0");
    return padded.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const extractDateValue = (row: any) => {
  const dateKey = Object.keys(row).find(k => k.trim().toUpperCase() === "MES-ANO" || k.trim().toUpperCase().includes("MES-ANO"));
  return dateKey ? row[dateKey] : null;
};

const getSortableDate = (val: any): number => {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') {
    return Math.round((val - 25569) * 86400 * 1000);
  }
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
};

const formatMonthYear = (val: any) => {
  if (!val) return "-";
  let d: Date | null = null;

  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'number') {
    d = new Date(Math.round((val - 25569) * 86400 * 1000));
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  } else if (typeof val === 'string') {
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else {
      d = new Date(val);
    }
  }

  if (d && !isNaN(d.getTime())) {
    try {
      return format(d, "MM/yyyy");
    } catch {
      return String(val);
    }
  }
  return String(val);
};

export default function Home() {
  const [municipio, setMunicipio] = useState("Cuiabá");
  const [dataAssinatura, setDataAssinatura] = useState(() =>
    format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  );
  const [presidenteCmdca, setPresidenteCmdca] = useState("Ivete Carneiro de Souza");
  const [secretariaSmSocial, setSecretariaSmSocial] = useState("Hélida Vilela de Oliveira");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintAllMode, setIsPrintAllMode] = useState<boolean>(false);
  const [isLoadingPrintAll, setIsLoadingPrintAll] = useState<boolean>(false);

  const [buscaNome, setBuscaNome] = useState("");
  const [buscaDocumento, setBuscaDocumento] = useState("");

  const [rawData, setRawData] = useState<RawDataEntry[]>([]);
  const [isRawDataOpen, setIsRawDataOpen] = useState(true);
  const [isDonorsOpen, setIsDonorsOpen] = useState(true);

  const [selectedDonorIndex, setSelectedDonorIndex] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Excel
  const processExcel = (file: File) => {
    setError(null);
    const validExtensions = ["xls", "xlsx"];
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (!ext || !validExtensions.includes(ext)) {
      setError("Por favor, envie um arquivo Excel válido (.xls ou .xlsx).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsa = XLSX.utils.sheet_to_json<RawDataEntry>(worksheet);
        setRawData(jsa);
        setSelectedDonorIndex(0);
      } catch {
        setError("Erro ao processar a planilha. Tem certeza que é um arquivo Excel válido?");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processExcel(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcel(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Process Unique Donors
  const donors = useMemo<DonorEntry[]>(() => {
    if (!rawData || rawData.length === 0) return [];

    const donorsMap = new Map<string, DonorEntry>();
    let counter = 1;

    rawData.forEach((row) => {
      // Procura por NOME e DOCUMENTO ignorando captalização
      const nomeKey = Object.keys(row).find(k => k.trim().toUpperCase() === "NOME" || k.trim().toUpperCase() === "DOADOR");
      const docKey = Object.keys(row).find(k => k.trim().toUpperCase().includes("DOCUMENTO") || k.trim().toUpperCase() === "CPF" || k.trim().toUpperCase() === "CNPJ");
      const valorKey = Object.keys(row).find(k => k.trim().toUpperCase().includes("VALOR"));

      let rawNome = nomeKey ? row[nomeKey] : null;
      let rawDoc = docKey ? row[docKey]?.toString() : null;
      const rawValor = valorKey ? parseFloat(row[valorKey]?.toString().replace(/[^\d.,-]/g, '').replace(',', '.')) : 0;

      if (!rawNome) rawNome = "NÃO IDENTIFICADO";
      if (!rawDoc) rawDoc = "00000000000";

      const nomeClean = rawNome.toString().trim().toUpperCase();
      const docNumeric = rawDoc.toString().replace(/\D/g, "");
      const uniqueKey = `${nomeClean}-${docNumeric}`;

      if (!donorsMap.has(uniqueKey)) {
        donorsMap.set(uniqueKey, {
          NUM_RECIBO: counter++,
          NOME: nomeClean,
          DOCUMENTO: applyDocumentMask(rawDoc),
          originalDocumento: rawDoc,
          totalDoado: Number.isNaN(rawValor) ? 0 : rawValor,
          doacoes: [row],
        });
      } else {
        const existing = donorsMap.get(uniqueKey)!;
        existing.doacoes.push(row);
        existing.totalDoado += Number.isNaN(rawValor) ? 0 : rawValor;
      }
    });

    return Array.from(donorsMap.values());
  }, [rawData]);

  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      const matchNome = d.NOME.includes(buscaNome.toUpperCase());
      const matchDoc = d.DOCUMENTO.includes(buscaDocumento) || d.originalDocumento.includes(buscaDocumento);
      return matchNome && matchDoc;
    });
  }, [donors, buscaNome, buscaDocumento]);

  const selectedDonor = donors[selectedDonorIndex];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 print:bg-white print:pb-0">
      {/* Header */}
      <header className="bg-indigo-700 text-white py-6 shadow-md print:hidden">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8" />
            Gerador de Relatórios de Doações
          </h1>
          <p className="text-indigo-100 mt-1">Transforme planilhas Excel em recibos oficiais em segundos.</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 duration-500 opacity-100 transition-opacity print:p-0 print:space-y-0">

        {/* Helper / Instructions Section */}
        <section className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
          <div className="flex gap-4">
            <div className="mt-1 flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-1">Como formatar sua planilha?</h2>
              <p className="text-blue-800 text-sm leading-relaxed">
                Para que o sistema consiga agrupar os recibos corretamente, sua planilha precisa conter colunas claras para o <strong>NOME</strong> (ou DOADOR), o <strong>DOCUMENTO</strong> (CPF/CNPJ), o <strong>VALOR</strong> da doação e a data (ex: <strong>MES-ANO</strong>).<br />
                Baixe a planilha modelo abaixo e utilize-a como base para organizar seus dados antes de fazer o upload.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                // Ao invés de <a href=...>, no Electron precisamos forçar o download via Blob, 
                // pois o HTML 5 attribute 'download' muitas vezes é ignorado em protocolos file://
                const response = await fetch("./docs/EXEMPLO-PLANILHA.xlsx");
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                const tempLink = document.createElement("a");
                tempLink.href = url;
                tempLink.setAttribute("download", "EXEMPLO-PLANILHA.xlsx");
                document.body.appendChild(tempLink);
                tempLink.click();

                // Cleanup
                document.body.removeChild(tempLink);
                window.URL.revokeObjectURL(url);
              } catch (err) {
                console.error("Erro ao baixar arquivo", err);
                alert("Não foi possível baixar o arquivo de exemplo no momento.");
              }
            }}
            className="flex-shrink-0 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Baixar Planilha Exemplo
          </button>
        </section>

        {/* Settings Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
          <h2 className="text-lg font-semibold mb-4 text-slate-800">Configurações do Relatório</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Presidente do CMDCA</label>
              <input
                type="text"
                value={presidenteCmdca}
                onChange={(e) => setPresidenteCmdca(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Secretária SMSocial</label>
              <input
                type="text"
                value={secretariaSmSocial}
                onChange={(e) => setSecretariaSmSocial(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Município</label>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data da Assinatura</label>
              <input
                type="text"
                value={dataAssinatura}
                onChange={(e) => setDataAssinatura(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section className="print:hidden">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50"
              }`}
          >
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              ref={fileInputRef}
            />
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full ${isDragging ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
                <UploadCloud className="w-10 h-10" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-700">Arraste sua planilha aqui ou</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Selecione um Arquivo
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-2">Suporta .xlsx e .xls</p>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </section>

        {/* Data Sections */}
        {rawData.length > 0 && (
          <div className="space-y-6 print:hidden">

            {/* Raw Data Toggle */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setIsRawDataOpen(!isRawDataOpen)}
                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Dados Brutos ({rawData.length} linhas)</h2>
                </div>
                {isRawDataOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              </button>

              {isRawDataOpen && (
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                      <tr>
                        {Object.keys(rawData[0]).map((key) => (
                          <th key={key} className="px-6 py-3 whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="px-6 py-4 whitespace-nowrap">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rawData.length > 50 && (
                    <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 border-t">
                      Mostrando apenas as primeiras 50 linhas para melhor performance.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Unique Donors Toggle */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors">
                <button
                  onClick={() => setIsDonorsOpen(!isDonorsOpen)}
                  className="flex items-center gap-3 flex-grow text-left focus:outline-none"
                >
                  <User className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Doadores Únicos ({donors.length})</h2>
                  {isDonorsOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>
                <button
                  onClick={() => {
                    if (isPrintAllMode || isLoadingPrintAll) return;
                    setIsLoadingPrintAll(true);
                    // Pequeno atraso para dar tempo ao React de renderizar o estado de carregamento do botão
                    // antes de travar a main thread do navegador processando dezenas de recibos no DOM da tela Preview
                    setTimeout(() => {
                      setIsPrintAllMode(true);
                      setIsLoadingPrintAll(false);
                    }, 50);
                  }}
                  className="ml-4 px-4 py-2 bg-indigo-600 text-white cursor-pointer rounded-lg hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[155px] justify-center"
                  disabled={donors.length === 0 || isPrintAllMode || isLoadingPrintAll}
                >
                  {isLoadingPrintAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  {isLoadingPrintAll ? "Carregando..." : "Imprimir Todos"}
                </button>
              </div>

              {isDonorsOpen && (
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                      <tr>
                        <th className="px-6 py-3 border-b">Ação</th>
                        <th className="px-6 py-3 border-b">Nº Recibo</th>
                        <th className="px-6 py-3 border-b">
                          <div className="flex flex-col gap-2">
                            <span>Nome do Doador</span>
                            <input
                              type="text"
                              placeholder="Filtrar por nome..."
                              value={buscaNome}
                              onChange={(e) => setBuscaNome(e.target.value)}
                              className="px-2 py-1 text-sm font-normal normal-case border border-slate-300 rounded outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                            />
                          </div>
                        </th>
                        <th className="px-6 py-3 border-b">
                          <div className="flex flex-col gap-2">
                            <span>CPF/CNPJ</span>
                            <input
                              type="text"
                              placeholder="Filtrar por doc..."
                              value={buscaDocumento}
                              onChange={(e) => setBuscaDocumento(e.target.value)}
                              className="px-2 py-1 text-sm font-normal normal-case border border-slate-300 rounded outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                            />
                          </div>
                        </th>
                        <th className="px-6 py-3 border-b">Total Doado</th>
                        <th className="px-6 py-3 border-b">Vol. Doações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDonors.map((donor, idx) => {
                        // precisamos encontrar o indíce real no array original de "donors" para o "selectedDonorIndex" não quebrar 
                        // ao clicar em um doador pós-filtrado.
                        const originalIndex = donors.findIndex(d => d.NUM_RECIBO === donor.NUM_RECIBO);

                        return (
                          <tr key={idx} className={`border-b hover:bg-slate-50 transition-colors ${selectedDonorIndex === originalIndex ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => {
                                  setSelectedDonorIndex(originalIndex);
                                  setIsPrintAllMode(false);
                                }}
                                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${selectedDonorIndex === originalIndex && !isPrintAllMode ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                              >
                                Ver Recibo
                              </button>
                            </td>
                            <td className="px-6 py-4 font-mono font-medium text-slate-600">{donor.NUM_RECIBO.toString().padStart(4, '0')}</td>
                            <td className="px-6 py-4 font-semibold text-slate-800">{donor.NOME}</td>
                            <td className="px-6 py-4 font-mono">{donor.DOCUMENTO}</td>
                            <td className="px-6 py-4 text-emerald-700 font-medium">{formatCurrency(donor.totalDoado)}</td>
                            <td className="px-6 py-4 text-slate-500">{donor.doacoes.length} registro(s)</td>
                          </tr>
                        )
                      })}
                      {filteredDonors.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">
                            Nenhum doador encontrado com os filtros aplicados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        )}

        {/* Document Preview (A4 Sim) */}
        {(selectedDonor || isPrintAllMode) && (
          <section className="mt-12 print:mt-0">
            <div className="flex items-center justify-between mb-6 print:hidden">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Printer className="w-6 h-6 text-emerald-600" />
                {isPrintAllMode ? `Preview de Impressão em Lote (${donors.length} Recibos)` : "Preview do Documento Oficial"}
              </h2>
              <div className="flex gap-4">
                {isPrintAllMode && (
                  <button
                    onClick={() => setIsPrintAllMode(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 cursor-pointer rounded-lg hover:bg-slate-300 transition-colors shadow-sm font-medium"
                  >
                    Sair do Modo Lote
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 text-white cursor-pointer rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Imprimir / PDF
                </button>
              </div>
            </div>

            {/* Renderizar UM (Selecionado) ou TODOS baseado no estado */}
            <div className={`print:block print:space-y-0 ${isPrintAllMode ? '' : 'space-y-8'}`}>
              {(isPrintAllMode ? donors : [selectedDonor]).map((donor, index) => (
                <div
                  key={'relatorio-recibo-' + index}
                  className="bg-white shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] p-[20mm] flex flex-col relative print:shadow-none print:max-w-none print:w-full print:p-0 print:m-0 print:min-h-0 print:h-auto"
                  style={{
                    fontFamily: "Arial, sans-serif",
                    pageBreakBefore: isPrintAllMode && index > 0 ? "always" : "auto"
                  }}
                >

                  {/* Cabeçalho */}
                  <div className="flex items-center gap-6 mb-12 mt-6 border-2 pb-6 w-full px-8">
                    {/* Logo CMDCA */}
                    <div className="flex-shrink-0 w-[100px] h-[100px] flex items-center justify-center">
                      <img
                        src="./images/cmdca-logo.jpg"
                        alt="CMDCA Cuiabá"
                        className="max-w-[100px] max-h-[100px] object-contain"
                      />
                    </div>
                    {/* Texto CMDCA */}
                    <div className="flex-1 text-center">
                      <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900 leading-tight">
                        CONSELHO MUNICIPAL DOS DIREITOS DA CRIANÇA E DO ADOLESCENTE DE CUIABÁ
                      </h1>
                    </div>
                  </div>

                  {/* Corpo */}
                  <div className="flex-grow space-y-6 text-justify text-base leading-relaxed text-slate-800">
                    <div className="font-bold border px-3 py-1 text-base mb-4 text-center inline-block w-full">
                      RECIBO Nº {donor.NUM_RECIBO.toString().padStart(4, '0')} / 2025
                    </div>
                    <p>
                      <strong>O CMDCA – Conselho Municipal dos Direitos da Criança e do Adolescente de Cuiabá, recebeu de:</strong>
                    </p>
                    <p>
                      NOME: <strong className="uppercase px-1">{donor.NOME}</strong>
                    </p>
                    <p>
                      CPF/CNPJ: <strong className="px-1">{donor.DOCUMENTO}</strong>
                    </p>
                    <p>
                      O valor totalizado abaixo, referente à(s) doação(ões) realizada(s) no ano de 2025 para o Fundo Criança – Fundo Municipal dos Direitos da Criança e do Adolescente, sob CNPJ nº 07.687.045/0001-25 na forma prevista no art. 260, da Lei nº 8.069 de 13/07/1990, alterado pelo art. 10 da Lei nº 8.242 de 12/1991.
                    </p>

                    <div className="pt-2">
                      <h3 className="font-bold text-slate-900 border-b pb-2 mb-4">Detalhamento das Doações</h3>
                      <table className="w-full text-sm border-collapse ring-1 ring-slate-300 rounded overflow-hidden">
                        <thead className="">
                          <tr>
                            <th className="border px-4 py-2 text-left">DATA</th>
                            <th className="border px-4 py-2 text-right">VALOR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...donor.doacoes].sort((a, b) => {
                            const dateA = extractDateValue(a);
                            const dateB = extractDateValue(b);
                            return getSortableDate(dateA) - getSortableDate(dateB);
                          }).map((d, i) => {
                            const dateVal = extractDateValue(d);
                            const dateFormatted = formatMonthYear(dateVal);

                            const valorKey = Object.keys(d).find(k => k.trim().toUpperCase().includes("VALOR"));
                            const rawValor = valorKey ? d[valorKey] : "-";
                            const formatVal = parseFloat(rawValor?.toString().replace(/[^\d.,-]/g, '').replace(',', '.'));

                            return (
                              <tr key={i} className="border-b border-slate-200">
                                <td className="border px-4 py-2 text-slate-800 font-mono text-sm uppercase">
                                  {dateFormatted}
                                </td>
                                <td className="border px-4 py-2 text-right font-medium text-slate-800">
                                  {Number.isNaN(formatVal) ? rawValor : formatCurrency(formatVal)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="print:table-row-group">
                          <tr>
                            <td className="border px-4 py-2 text-right font-bold uppercase">Total Geral das Doações:</td>
                            <td className="border px-4 py-2 text-right font-bold">
                              {formatCurrency(donor.totalDoado)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Rodapé / Assinaturas */}
                  <div className="mt-10">
                    <div className="text-right mb-16">
                      {municipio}, {dataAssinatura}
                    </div>

                    <div className="grid grid-cols-2 gap-12 text-center text-sm">
                      <div className="border-t border-slate-400 pt-2">
                        <p className="font-bold uppercase text-slate-900">{presidenteCmdca}</p>
                        <p className="text-slate-500">Presidente do CMDCA</p>
                      </div>
                      <div className="border-t border-slate-400 pt-2">
                        <p className="font-bold uppercase text-slate-900">{secretariaSmSocial}</p>
                        <p className="text-slate-500">Secretária SMSocial</p>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
