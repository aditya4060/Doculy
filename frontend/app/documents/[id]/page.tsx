import { DocumentChat } from "@/components/DocumentChat";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;
  return <DocumentChat documentId={id} />;
}
