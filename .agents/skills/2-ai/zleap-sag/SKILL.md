---
name: zleap-sag
description: SQL-Driven RAG engine by Zleap AI that automatically builds knowledge graphs at query time. Use when implementing RAG systems, document retrieval, multi-hop QA, or knowledge graph-enhanced search.
---

# Zleap SAG (SQL-Retrieval Augmented Generation)

SAG is a SQL-driven next-generation RAG engine that builds knowledge graphs dynamically during query time instead of pre-maintaining them.

## Core Concepts

- **Event Atomization**: Documents are decomposed into semantically complete, mutually independent "Events" (not character/token chunks)
- **Natural Language Vector**: Multi-dimensional entities (time, location, person, action, topic, tags) extracted per event
- **Query-Time Graph Construction**: Relationships calculated dynamically at query time, not pre-built

## Three-Stage Search

1. **Recall** - Entity-driven: LLM parses query → vector entity search → SQL event lookup → intersection filtering
2. **Expand** - BFS multi-hop expansion via shared entity patterns (depth 2 optimal)
3. **Rerank** - Weighted PageRank on event subgraph with 4-factor scoring (PR + similarity + entity score + time decay)

## Key Features

- Automatic document understanding and event decomposition
- Intelligent association without pre-maintaining graphs
- Complete traceability back to source
- Custom entity types for any business scenario
- Incremental writes and concurrent processing
- Production scale: hundreds of millions of items, sub-second latency

## Usage

```bash
# Clone
git clone https://github.com/Zleap-AI/SAG.git

# Install
cd SAG
pip install -r requirements.txt

# Run with documents (Markdown/TXT)
python main.py --docs ./my-documents/
```

## Links

- GitHub: https://github.com/Zleap-AI/SAG
- Full edition: https://zleap.ai
