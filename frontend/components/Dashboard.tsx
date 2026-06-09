"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Trash2 } from "lucide-react";
import { deleteDocument, listDocuments } from "@/lib/api";
import type { DocumentRecord } from "@/types/doculy";
import { StatusBadge } from "@/components/StatusBadge";
import { UploadCard } from "@/components/UploadCard";

export function Dashboard() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function removeDocument(id: string) {
    setError(null);
    try {
      await deleteDocument(id);
      setDocuments((current) => current.filter((document) => document.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete document.");
    }
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8">
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Doculy</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Upload a document, ask focused questions, and get grounded answers with source snippets.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <UploadCard onUploaded={refresh} />

        <section className="rounded-lg border border-line bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold">Documents</h2>
            <span className="text-sm text-slate-500">{documents.length} total</span>
          </div>

          {error && <p className="border-b border-line px-5 py-3 text-sm text-rose-700">{error}</p>}

          {isLoading ? (
            <p className="px-5 py-10 text-sm text-slate-500">Loading documents...</p>
          ) : documents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText className="mx-auto text-slate-400" size={32} aria-hidden />
              <p className="mt-3 text-sm font-medium">No documents yet</p>
              <p className="mt-1 text-sm text-slate-500">Upload a PDF or TXT file to start chatting.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {documents.map((document) => (
                <article key={document.id} className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-1 rounded-md bg-slate-100 p-2 text-slate-600">
                      <FileText size={18} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{document.original_filename}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={document.status} />
                        <span className="text-xs uppercase text-slate-500">{document.file_type}</span>
                      </div>
                      {document.error_message && (
                        <p className="mt-2 text-sm text-rose-700">{document.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/documents/${document.id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-line px-3 text-sm font-medium hover:bg-slate-50"
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeDocument(document.id)}
                      className="inline-flex size-9 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                      aria-label={`Delete ${document.original_filename}`}
                      title="Delete"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
