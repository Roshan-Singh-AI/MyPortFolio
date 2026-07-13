/**
 * Honest answer composition for the "Ask my work" demo.
 *
 * There is NO LLM here. We take the top retrieved chunks and stitch their
 * sentences into a short, readable, citation-tagged summary. The UI labels
 * this clearly as a "retrieval-grounded answer, composed from the matched
 * sources" -- we never pretend a live model wrote it. The honesty is the
 * point: it shows understanding of grounding and citation.
 */

import type { ScoredChunk } from "@/lib/retrieval";
import { CONFIDENCE_FLOOR } from "@/lib/confidence";

export type ComposedAnswer = {
  /** The stitched, cited answer text. Empty if nothing matched. */
  text: string;
  /** Distinct sources cited, in order of first appearance. */
  citations: string[];
  /** True when the top score is too low to trust the match. */
  lowConfidence: boolean;
};

/**
 * Pull the first 1-2 sentences from a chunk so answers stay tight.
 *
 * The splitter is abbreviation-aware: a '.' only ends a sentence when it is
 * followed by whitespace + an uppercase/opening char or the end of the text.
 * This keeps intra-word dots in tokens like "B.E.", "GPT-4o", "2.5" together
 * instead of chopping "He holds a B.E. in ..." down to "He holds a B.".
 */
function leadSentences(text: string, max = 2): string {
  // `[\s\S]+?` (lazy, matches any char incl. newlines) lets a sentence contain
  // interior dots like "B.E." / "2.5" / "GPT-4o"; the lookahead only ends the
  // sentence at punctuation followed by whitespace + a sentence-starting char,
  // or end-of-text.
  const sentences =
    text.match(/[\s\S]+?[.!?]+(?=\s+[A-Z0-9"'([]|\s*$)/g) ?? [text];
  return sentences
    .slice(0, max)
    .map((s) => s.trim())
    .join(" ");
}

/**
 * Compose a grounded answer from the retrieved chunks. We take the top few
 * matches above the confidence floor, lead with their key sentences, and
 * tag each fragment with its source like `[CSAI Hub]`.
 */
export function composeAnswer(
  results: ScoredChunk[],
  maxSources = 3,
): ComposedAnswer {
  const top = results[0];
  const lowConfidence = !top || top.score < CONFIDENCE_FLOOR;

  if (lowConfidence) {
    return {
      text:
        "No chunk scored high enough to answer that with confidence. Try one of the suggested questions, or ask about Roshan's agents, RAG, GraphRAG, evaluation, or a specific project.",
      citations: [],
      lowConfidence: true,
    };
  }

  const used = results
    .filter((r) => r.score >= CONFIDENCE_FLOOR)
    .slice(0, maxSources);

  const seenSources = new Set<string>();
  const citations: string[] = [];
  const parts = used.map((r) => {
    // Only cite + inline-tag the FIRST chunk from a given source, so the inline
    // [source] tags, the citation pills, and the "grounded on N sources" count
    // all agree (dedupe on source, not just the citation label).
    const first = !seenSources.has(r.chunk.source);
    if (first) {
      seenSources.add(r.chunk.source);
      citations.push(r.chunk.source);
    }
    return `${leadSentences(r.chunk.text)}${first ? ` [${r.chunk.source}]` : ""}`;
  });

  return { text: parts.join(" "), citations, lowConfidence: false };
}
