"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { askQuestion, getDocument, listMessages } from "@/lib/api";
import type { ChatMessage, DocumentRecord, SourceSnippet } from "@/types/doculy";
import { StatusBadge } from "@/components/StatusBadge";

export function DocumentChat({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextDocument, nextMessages] = await Promise.all([
        getDocument(documentId),
        listMessages(documentId)
      ]);
      setDocument(nextDocument);
      setMessages(nextMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load document.");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    const pendingUser: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: trimmed,
      sources_json: null,
      created_at: new Date().toISOString()
    };
    setMessages((current) => [...current, pendingUser]);
    setQuestion("");
    setIsAsking(true);
    setError(null);

    try {
      const response = await askQuestion(documentId, trimmed);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        sources_json: response.sources,
        created_at: new Date().toISOString()
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not answer question.");
      setMessages((current) => current.filter((message) => message.id !== pendingUser.id));
    } finally {
      setIsAsking(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6">
      <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-ink">
        <ArrowLeft size={16} aria-hidden />
        Dashboard
      </Link>

      <section className="rounded-lg border border-line bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{document?.original_filename ?? "Document"}</h1>
            {document?.error_message && <p className="mt-1 text-sm text-rose-700">{document.error_message}</p>}
          </div>
          {document && <StatusBadge status={document.status} />}
        </div>

        {error && <p className="border-b border-line px-5 py-3 text-sm text-rose-700">{error}</p>}

        <div className="min-h-[520px] space-y-4 bg-paper px-4 py-5 sm:px-5">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading chat...</p>
          ) : messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
              <p className="text-sm font-medium">Ask a question about this document.</p>
              <p className="mt-1 text-sm text-slate-500">Answers will include the snippets used as sources.</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} sources={message.sources_json ?? []} />
            ))
          )}
          {isAsking && <p className="text-sm text-slate-500">Finding relevant context...</p>}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            placeholder="Ask a grounded question..."
            disabled={document?.status !== "ready" || isAsking}
            className="min-h-12 flex-1 resize-none rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={document?.status !== "ready" || isAsking || !question.trim()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} aria-hidden />
            Send
          </button>
        </form>
      </section>
    </main>
  );
}

function MessageBubble({ message, sources }: { message: ChatMessage; sources: SourceSnippet[] }) {
  const isUser = message.role === "user";

  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[840px] rounded-lg border px-4 py-3 text-sm leading-6 ${
          isUser ? "border-teal-200 bg-teal-50" : "border-line bg-white"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && sources.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-slate-500">Sources</p>
            {sources.map((source) => (
              <div key={`${source.chunk_index}-${source.page_number}`} className="rounded-md border border-line bg-slate-50 p-3">
                <div className="mb-1 flex gap-2 text-xs font-medium text-slate-500">
                  <span>Chunk {source.chunk_index}</span>
                  <span>{source.page_number ? `Page ${source.page_number}` : "TXT"}</span>
                </div>
                <p className="text-xs leading-5 text-slate-700">{source.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
