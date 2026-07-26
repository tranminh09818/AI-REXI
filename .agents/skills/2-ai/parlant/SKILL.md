---
name: parlant
description: Open-source conversational control layer for building reliable customer-facing AI agents. Use when building support, sales, onboarding, or advisory agents that need consistent tone, policy compliance, and auditability.
---

# Parlant

Parlant is an agentic harness by Emcie for building maintainable conversational AI agents with a structured behavioral control layer.

## Core Concepts

- **Guidelines**: Behavioral rules as condition-action pairs; engine evaluates which apply per turn
- **Tools**: External APIs and workflows triggered by context observation
- **Context Engineering**: Dynamic context narrowing per turn — only relevant guidelines, knowledge, and tools sent to LLM

## Key Features

- Replace fragile system prompts with code-defined behavior
- Multi-turn SOPs that adapt to customer interaction
- Dependencies and exclusions between guidelines
- Full OpenTelemetry tracing for every guideline match
- Framework-agnostic: works with LangGraph, Agno, LlamaIndex
- LLM-agnostic: OpenAI, Anthropic, LiteLLM, Emcie

## Installation

```bash
pip install parlant
```

## Quick Start

```python
from parlant import Agent

agent = Agent(
    guidelines=[
        "when customer asks about refund, offer full refund within 30 days",
        "when customer is angry, apologize and escalate to supervisor",
    ],
    tools=[check_order_status, process_refund],
)

response = await agent.process("I want my money back")
```

## Links

- Website: https://parlant.io
- GitHub: https://github.com/emcie-co/parlant
- PyPI: https://pypi.org/project/parlant/
