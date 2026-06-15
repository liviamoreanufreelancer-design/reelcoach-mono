/**
 * Biblioteca de diagrame — pagina admin (migration 007).
 * Listeaza toate diagramele; clientul gestioneaza filtre + upload + stergere.
 */
import { listDiagrams } from "@/lib/diagram-actions";
import DiagramLibrary from "@/components/DiagramLibrary";

export default async function DiagramsPage() {
  const diagrams = await listDiagrams();
  return <DiagramLibrary initialDiagrams={diagrams} />;
}
