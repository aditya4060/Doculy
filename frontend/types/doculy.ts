export type DocumentStatus = "processing" | "ready" | "failed";

export type DocumentRecord = {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
};

export type SourceSnippet = {
  page_number: number | null;
  chunk_index: number;
  content: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources_json: SourceSnippet[] | null;
  created_at: string;
};

export type ChatResponse = {
  answer: string;
  sources: SourceSnippet[];
};
