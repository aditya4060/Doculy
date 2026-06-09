import type { ChatMessage, ChatResponse, DocumentRecord } from "@/types/doculy";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed.";
    try {
      const body = await response.json();
      message = body.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const response = await fetch(`${API_BASE_URL}/documents`, { cache: "no-store" });
  return parseResponse<DocumentRecord[]>(response);
}

export async function getDocument(id: string): Promise<DocumentRecord> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, { cache: "no-store" });
  return parseResponse<DocumentRecord>(response);
}

export async function uploadDocument(file: File): Promise<DocumentRecord> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    body: form
  });
  return parseResponse<DocumentRecord>(response);
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, { method: "DELETE" });
  return parseResponse<void>(response);
}

export async function listMessages(documentId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/chat/${documentId}/messages`, {
    cache: "no-store"
  });
  return parseResponse<ChatMessage[]>(response);
}

export async function askQuestion(documentId: string, question: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat/${documentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });
  return parseResponse<ChatResponse>(response);
}
