"use client";

import { FormEvent, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { uploadDocument } from "@/lib/api";

export function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF or TXT file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await uploadDocument(file);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-teal-50 p-2 text-accent">
          <FileUp size={20} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Upload a document</h2>
          <p className="mt-1 text-sm text-slate-600">PDF and TXT files up to 10 MB.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="block w-full rounded-md border border-line bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Processing..." : "Upload"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
    </form>
  );
}
