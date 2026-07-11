Part of the agbrowse search skill - loaded from SKILL.md routing.

# Tier 3: Deep Research
Tier 3 is opt-in for comprehensive, contested, or genuinely multi-source questions
that require reconciling source classes, time periods, entities, or rival explanations.

Do not use Tier 3 for an ordinary "latest", "current", "find this page", or single-fact
lookup. Those stay in the normal discovery and Tier-2 proof path unless the user asks
for comprehensive research or the evidence becomes materially contested.

## Entry Gate

Enter Tier 3 only when at least one condition holds:

| Condition | Typical signal |
| --- | --- |
| Comprehensive scope | "deep research", "comprehensive review", "전부 조사해줘" |
| Contested conclusion | credible sources disagree or definitions conflict |
| Multi-source proof | no one source can prove all material claims |
| Comparative synthesis | several entities, eras, policies, or hypotheses must be tested |

State the scope and likely cost before invoking `--deep`. That option drives a
logged-in web-AI provider session through headed Chrome. It is slow, can take up to
five minutes at the CLI boundary, and consumes the selected provider's quota. A
logged-in provider session is required.

## The Research Lanes

Run the work as lanes yourself or delegate if your runtime supports it. Delegation is
optional; the protocol and proof threshold stay the same.

Useful lane types include:

- one lane per entity or organization;
- one lane per relevant time window or era;
- one lane per source class, such as legislation, official data, papers, or reporting;
- one lane per rival hypothesis;
- one independent disconfirmation lane.

Each lane must be a distinct line of proof. Rewording the same query is not another
lane.

## EXPAND Before Fetching

Expand the problem into query families before opening results. Record:

1. Entities: who or what could satisfy the question?
2. Time windows: what dates, eras, or version boundaries matter?
3. Source classes: which primary or authoritative source could prove each claim?
4. Rival hypotheses: what else could explain the evidence?
5. Constraints: what must be true for a candidate to survive?

Use the planner as a first decomposition pass:

```bash
agbrowse research plan --query "<problem>" --json
```

The `research-plan-v1` output exposes `atomicQueries`, `sourceHints`, and
`constraints`. Atomic queries carry purposes such as discovery, verification, or
source-restricted discovery. Treat them as a seed plan, not a complete search.

The planner also implements two anti-bias patterns:
- `buildEraSweepQueries` adds origin-oriented searches for beginnings, firsts, memes,
  or trends, reducing recency bias.
- `buildDisconfirmQuery` looks for a different or contrary candidate instead of only
  strengthening the current favorite.

Keep that discipline in the working ledger. Enumerate plausible rivals with the
equivalent of `registerRivals`; when evidence rules one out, record the reason with the
equivalent of `markCandidateDisconfirmed`. Do not erase failed candidates, because the
disconfirmation trail explains why the conclusion survived.

## Research Waves

Run at most five waves.

### Wave 1: Discover by Family

Use the consuming agent's native web-search capability for broad discovery. Search
each family separately and collect candidate URLs, titles, source type, date, and the
claim each result might prove. Search results are leads only.

Then put every candidate through Tier-2 proof by fetching the original page. Either
pipe normalized external results into the search orchestrator:

```bash
cat results.json | agbrowse search "<family query>" --stdin-results --json
```

or verify a known URL directly:

```bash
agbrowse search --verify "https://example.com/source" --json
```

`--stdin-results` accepts a JSON array or object from any available discovery tool;
it does not promise or require a particular search provider.

### Wave 2+: Chase Leads and Fill Gaps

Use the strongest proven sources to identify better primary sources, official records,
definitions, dates, named rivals, and missing constraints. Search specifically for the
remaining gaps. Repeat Tier-2 proof for every new candidate before updating claims.

At the end of each wave, record:

- new proven sources;
- new candidate leads;
- constraints moved from pending to supported;
- candidates disconfirmed and why;
- whether the wave produced any genuinely new lead.

Stop the wave loop when either condition fires:

1. Three consecutive results produce no new lead; or
2. Five waves have completed.

State which stop fired. A "new lead" means a new source, candidate, constraint-bearing
fact, or rival explanation that changes the next search. A duplicate or paraphrase does
not reset the counter.

## Claim Ledger and Journal

Maintain a human-readable claim journal alongside the machine output:

| Claim ID | Factual claim | Proving URL | Source class | Tier | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | Exact claim text | URL | primary/secondary | discovered/proven | unverified/verified |

Apply these rules strictly:

- `discovered` means a result, snippet, provider answer, or unopened citation suggested
  the claim.
- `proven` means the original source was opened or fetched and its contents support the
  exact claim.
- A claim without an opened-source proof remains `unverified`; never promote it from a
  plausible snippet, excerpt attribution, or synthesis alone.
- Cite only proven claims in the final answer.
- List useful unverified leads separately under open questions, with no factual voice.

Map the journal onto the `agbrowse-search-v1` envelope:

| Human journal | Machine field |
| --- | --- |
| Required claim dimensions | `plan.constraints` |
| Constraints with fetched support | `enrichment.ledger.supported` |
| Unresolved mandatory dimensions | `enrichment.ledger.pending` |
| Overall machine readiness | `enrichment.ledger.ready` and `evidenceStatus` |

The machine ledger starts with mandatory constraints pending, records evidence URLs on
supported constraints, and becomes ready only when none remain pending. Its matching is
a triage aid; the human journal remains responsible for exact claim-to-source fit.

## Optional `--deep` Escalation

Use `--deep` only after ordinary candidate enrichment is insufficient:

```bash
agbrowse search "<problem>" --deep --vendor grok --json
agbrowse search "<problem>" --deep --vendor chatgpt --json
agbrowse search "<problem>" --deep --vendor gemini --json
```

The default vendor is `grok`. When mandatory constraints remain pending, the search
orchestrator builds a prompt from the research question, fetched candidate excerpts,
and the unresolved constraint text. It then invokes:

```bash
agbrowse web-ai query --vendor <grok|chatgpt|gemini> --inline-only --prompt "..."
```

The child process has a 300-second timeout. The provider is asked to find authoritative
URLs and distinguish facts from inference, but its response is synthesis, not primary
evidence.

Therefore:

- treat every URL or claim in `deep.text` as a discovered lead;
- run each material lead through Tier-2 source proof;
- do not cite provider prose as proof of the underlying claim;
- do not report a deep-generated claim as verified until its original source passes.

An `evidenceStatus` of `partial` after deep escalation means exactly that: provider text
was returned while the fetched-evidence ledger was still not ready. It does not mean
the provider completed the missing proof.

## Overall Stop Conditions

Stop escalating and answer when one of these states is reached:

| State | Action |
| --- | --- |
| Sufficient | Primary or authoritative sources prove all material claims |
| Exhausted | All credible candidates are dead or the wave stop rule fired |
| Ambiguous | The next search depends on a definition, date range, or choice only the user can supply |

For `sufficient`, cite the proven sources and keep the conclusion within their scope.
For `exhausted`, report what was proven, what remains unverified, and which stop fired.
For `ambiguous`, stop and ask the smallest clarifying question needed to resume.
