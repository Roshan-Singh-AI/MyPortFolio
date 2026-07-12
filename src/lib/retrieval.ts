/**
 * Dependency-free, deterministic TF-IDF + cosine-similarity retriever.
 *
 * This is the retrieval core of the "Ask my work" demo. It runs 100%
 * client-side -- no ML libraries, no network calls, no API keys. Given a
 * corpus of knowledge chunks it builds a TF-IDF vector space once, then
 * scores any query against every chunk with cosine similarity and returns
 * the top-k matches. Same input -> same output, every time.
 *
 * Pipeline mirrors how real RAG retrieval works, just small enough to see:
 *   tokenize -> term frequency -> inverse document frequency -> tf-idf
 *   vectors -> L2 normalize -> cosine similarity -> rank.
 */

import type { KnowledgeChunk } from "@/content/knowledge";

/** Tiny English stopword set -- enough to keep scores meaningful for a demo. */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at",
  "for", "with", "as", "by", "is", "are", "was", "were", "be", "been", "being",
  "it", "its", "this", "that", "these", "those", "he", "she", "they", "them",
  "his", "her", "their", "do", "does", "did", "how", "what", "which", "who",
  "whom", "when", "where", "why", "can", "could", "would", "should", "will",
  "has", "have", "had", "i", "you", "we", "my", "me", "about", "into", "from",
  "up", "out", "so", "than", "then", "there", "here", "also", "not", "no",
]);

/**
 * Lowercase, strip punctuation, split on whitespace, drop stopwords and
 * single characters. Deterministic and Unicode-friendly for a portfolio.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.]/g, " ")
    // keep tech tokens like "gpt-4o", "recall@k", "c++" reasonably intact by
    // first collapsing separators, then trimming stray dots.
    .replace(/\./g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** term -> count for a single document. */
type TermCounts = Map<string, number>;

function termCounts(tokens: string[]): TermCounts {
  const counts: TermCounts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return counts;
}

/** A chunk plus its precomputed, L2-normalized TF-IDF vector. */
type IndexedChunk = {
  chunk: KnowledgeChunk;
  /** term -> normalized tf-idf weight. */
  vector: Map<string, number>;
  tokens: string[];
};

export type RetrievalIndex = {
  /** Inverse document frequency per term across the corpus. */
  idf: Map<string, number>;
  /** Number of documents in the corpus. */
  size: number;
  chunks: IndexedChunk[];
};

/** L2 norm of a sparse vector. */
function l2Norm(vec: Map<string, number>): number {
  let sum = 0;
  for (const v of vec.values()) sum += v * v;
  return Math.sqrt(sum);
}

/** Build a TF-IDF vector (sublinear tf) from term counts and corpus idf. */
function buildVector(
  counts: TermCounts,
  idf: Map<string, number>,
  fallbackIdf: number,
): Map<string, number> {
  const vec = new Map<string, number>();
  for (const [term, count] of counts) {
    // sublinear term frequency dampens the effect of repeated words.
    const tf = 1 + Math.log(count);
    const weight = tf * (idf.get(term) ?? fallbackIdf);
    if (weight > 0) vec.set(term, weight);
  }
  // L2-normalize so cosine similarity is just a dot product.
  const norm = l2Norm(vec);
  if (norm > 0) {
    for (const [term, w] of vec) vec.set(term, w / norm);
  }
  return vec;
}

/**
 * Build the TF-IDF index over the corpus once. Cheap for ~18 short chunks,
 * so callers can memoize it with useMemo and reuse it for every query.
 */
export function buildIndex(chunks: KnowledgeChunk[]): RetrievalIndex {
  const size = chunks.length;
  const docFreq = new Map<string, number>();
  const perDoc = chunks.map((chunk) => {
    const tokens = tokenize(chunk.text);
    const counts = termCounts(tokens);
    for (const term of counts.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
    return { chunk, tokens, counts };
  });

  // Smoothed idf: log((1 + N) / (1 + df)) + 1, always positive.
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((1 + size) / (1 + df)) + 1);
  }
  // idf for an unseen query term: treat as maximally rare.
  const fallbackIdf = Math.log((1 + size) / 1) + 1;

  const indexed: IndexedChunk[] = perDoc.map(({ chunk, tokens, counts }) => ({
    chunk,
    tokens,
    vector: buildVector(counts, idf, fallbackIdf),
  }));

  return { idf, size, chunks: indexed };
}

export type ScoredChunk = {
  chunk: KnowledgeChunk;
  /** Cosine similarity in [0, 1]. */
  score: number;
  /** Query terms that actually contributed to the score (for highlighting). */
  matchedTerms: string[];
};

/**
 * Score every chunk in the index against a query and return them sorted by
 * cosine similarity, highest first. `matchedTerms` lists the overlapping
 * query terms so the UI can explain *why* a chunk matched.
 */
export function scoreAll(index: RetrievalIndex, query: string): ScoredChunk[] {
  const queryTokens = tokenize(query);
  const fallbackIdf = Math.log((1 + index.size) / 1) + 1;
  const queryVec = buildVector(termCounts(queryTokens), index.idf, fallbackIdf);
  const queryTermSet = new Set(queryTokens);

  const scored = index.chunks.map(({ chunk, vector, tokens }) => {
    // cosine similarity = dot product of two L2-normalized vectors.
    let dot = 0;
    // iterate the smaller vector for efficiency.
    const [small, large] =
      queryVec.size < vector.size ? [queryVec, vector] : [vector, queryVec];
    for (const [term, w] of small) {
      const other = large.get(term);
      if (other !== undefined) dot += w * other;
    }
    const matchedTerms = [...new Set(tokens)].filter((t) =>
      queryTermSet.has(t),
    );
    return { chunk, score: dot, matchedTerms };
  });

  // Stable sort: score desc, then original id for determinism on ties.
  return scored.sort(
    (a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id),
  );
}

/** Convenience: score and slice to the top-k results. */
export function retrieve(
  index: RetrievalIndex,
  query: string,
  k: number,
): ScoredChunk[] {
  return scoreAll(index, query).slice(0, k);
}
