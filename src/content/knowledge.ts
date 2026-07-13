/**
 * Client-side knowledge base for the "Ask my work" retrieval demo.
 *
 * Every chunk is a short, honest fact drawn directly from the site content
 * (experience, projects, skills, about). The AskMyWork widget scores these
 * chunks against a visitor's question with a plain-TS TF-IDF + cosine
 * retriever -- no LLM, no network, no keys. It is a tiny RAG system that
 * proves Roshan builds RAG by being one.
 *
 * Keep chunks short and self-contained: each should read as a single
 * retrievable "fact" and carry a human-readable `source` for citation.
 */

export type KnowledgeChunk = {
  /** Stable id, used as React key and for deterministic ordering. */
  id: string;
  /** The retrievable text. One idea per chunk. */
  text: string;
  /** Human-readable citation label, e.g. "CSAI Hub", "Multihop-GraphRAG". */
  source: string;
};

export const knowledge: KnowledgeChunk[] = [
  {
    id: "csai-hub-agent",
    source: "CSAI Hub",
    text: "Roshan owns the UI agent inside CSAI Hub, an internal Bosch platform that turns a plain-language idea into a working full-stack app, going from interview to docs to code. The agent generates production React, Next.js and TypeScript UIs and wires them to generated backend APIs.",
  },
  {
    id: "csai-hub-selfheal",
    source: "CSAI Hub",
    text: "The CSAI Hub UI agent self-validates through a generate, check and fix loop, testing its own generated output with Playwright and enforcing the Bosch design system. It is built with LangGraph, Azure OpenAI and Claude, and is now in pilot.",
  },
  {
    id: "csai-hub-mcp",
    source: "CSAI Hub",
    text: "Roshan built an MCP server that serves Bosch design-system ADUX components on demand to the UI agent. This is a concrete example of Model Context Protocol tool integration in production.",
  },
  {
    id: "parts-classification",
    source: "Parts-data classification",
    text: "In his first project at Bosch, a two-person proof of concept he owned, Roshan used text-embedding-3-large with cosine-similarity matching and human-in-the-loop thresholds to classify messy multi-language dealer parts data into Bosch's official reporting structure across four countries, roughly 2 million records.",
  },
  {
    id: "parts-kpi",
    source: "Parts-data classification",
    text: "The parts-data classification project hit its target KPIs, 70 percent sub-group and 20 percent position-group accuracy, on three of the four country datasets. Roshan joined client meetings for both requirements gathering and presenting results.",
  },
  {
    id: "docupedia-rag",
    source: "DocupediaAI",
    text: "Roshan built the RAG pipeline behind DocupediaAI, an enterprise knowledge assistant: ingestion, chunking, embedding and connectors into enterprise data sources. He added Responsible-AI guardrails and PII redaction so answers stay compliant.",
  },
  {
    id: "agent-as-a-service",
    source: "Agent-as-a-Service",
    text: "For a shared agent platform Roshan built ReAct and delegation agents, wrote MCP tool integrations, and contributed reusable orchestration components. His agents plan, call tools, self-validate and recover.",
  },
  {
    id: "multihop-graphrag",
    source: "Multihop-GraphRAG",
    text: "Multihop-GraphRAG is Roshan's open-source hybrid retrieval system for multi-hop question answering. It pairs dense vector search with Neo4j graph traversal, and an LLM-driven ETL extracts entities and relationships from documents.",
  },
  {
    id: "multihop-fusion",
    source: "Multihop-GraphRAG",
    text: "Multihop-GraphRAG fuses vector, keyword and graph scores to answer multi-hop questions with citations. It ships a retrieval inspector, a graph explorer, a hybrid-versus-vector benchmark, and a live Streamlit demo in Docker. Built with Python, LangChain, Neo4j and Groq.",
  },
  {
    id: "agent-memory",
    source: "Agent Memory",
    text: "Agent Memory is Roshan's open-source long-term memory library for LLM agents. It exposes episodic, semantic and procedural memory as memory-as-tools: store, retrieve, update, summarize and discard. It degrades gracefully without an API key and has 39 passing tests.",
  },
  {
    id: "agent-memory-ranking",
    source: "Agent Memory",
    text: "Agent Memory recall ranks memories by a blend of similarity, salience and recency, using embeddings and semantic search. Built with Python, tool calling, Groq, pytest and uv.",
  },
  {
    id: "smart-retrieval-router",
    source: "Smart Retrieval Router",
    text: "Smart Retrieval Router is Roshan's open-source project that adds a second-stage reranker, lexical, cross-encoder or LLM, to reorder retrieval candidates, plus a difficulty router that sends easy queries to a small model and hard ones to a frontier model.",
  },
  {
    id: "smart-retrieval-cost",
    source: "Smart Retrieval Router",
    text: "Smart Retrieval Router pairs a difficulty-based router (easy queries to a small model, hard ones to a frontier model) with a second-stage reranker, and ships a cost model that quantifies the savings versus always using the frontier model for a given traffic mix. It uses Python, cross-encoders, model routing and cost optimization, and has 30 passing tests.",
  },
  {
    id: "evaluation",
    source: "What I do",
    text: "Roshan evaluates instead of guessing: reranking, cost-aware routing, RAGAS and recall@k metrics, guardrails and PII redaction. He measures how RAG and agents actually perform.",
  },
  {
    id: "agents-capability",
    source: "What I do",
    text: "Roshan builds agents that ship: LangGraph orchestration, ReAct plus delegation patterns, and MCP tool integrations. His agents plan, call tools, self-validate and recover from failures.",
  },
  {
    id: "retrieval-capability",
    source: "What I do",
    text: "Roshan builds retrieval systems: RAG and GraphRAG pipelines with hybrid vector, graph and keyword fusion, cited answers, and clean enterprise ingestion.",
  },
  {
    id: "about-focus",
    source: "About",
    text: "Roshan is an AI engineer who likes the unglamorous parts of GenAI: the retrieval that finds the right context, the agent that recovers when a tool fails, and the evaluation that tells you whether it works. He is a GenAI Engineer on the Applied AI team at Bosch Global Software Technologies (joined January 2024).",
  },
  {
    id: "about-recognition",
    source: "About",
    text: "Roshan has been recognized twice by Bosch, with the Rockstar and Excellence awards, for delivery speed and ownership. He holds a B.E. in Computer Science from Chandigarh University and is based in Pune, India, open to relocation to Bengaluru or Hyderabad.",
  },
  {
    id: "highlights",
    source: "About",
    text: "Career highlights: Roshan owns the UI agent in CSAI Hub (an org-wide app-builder now in pilot at Bosch), shipped a 4-country ~2M-record parts-data classification PoC that hit its target KPIs, built the RAG pipeline behind the enterprise assistant DocupediaAI, and open-sourced several AI systems including Multihop-GraphRAG, Agent Memory, and Smart Retrieval Router. His standout is CSAI Hub for scope and ownership; his most technically ambitious open-source work is Multihop-GraphRAG.",
  },
  {
    id: "why-hire",
    source: "About",
    text: "Roshan works on the parts of GenAI that decide whether a system holds up in production: retrieval quality, agents that recover from tool failures, and evaluation with real metrics. He owns features end to end, keeps his open-source projects under test, and weighs cost and latency alongside accuracy.",
  },
  {
    id: "tech-stack",
    source: "About",
    text: "Roshan's core stack: Python and TypeScript; RAG, GraphRAG, LangChain, LangGraph, MCP, ReAct and multi-agent patterns, reranking, embeddings and hybrid search; LLMs via Azure OpenAI (GPT-4o), Anthropic Claude, Groq (Llama) and Hugging Face; vector and graph stores FAISS, Pinecone, ChromaDB and Neo4j; FastAPI backends; evaluation with RAGAS and recall@k; tooling with Docker, LangSmith, pytest and uv.",
  },
];
