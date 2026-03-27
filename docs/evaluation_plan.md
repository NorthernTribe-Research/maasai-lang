# Evaluation Plan

## Automatic Metrics

| Metric | Tool | Purpose |
|--------|------|---------|
| BLEU | sacrebleu | Standard MT quality measure |
| chrF++ | sacrebleu | Character-level quality (important for morphologically rich Maa) |
| Terminology Accuracy | Custom | % of protected glossary terms correctly preserved |
| Length Ratio | Custom | Detect over-generation or under-generation |

## Human Evaluation

### Dimensions
1. **Faithfulness** — Does the translation preserve the original meaning?
2. **Fluency** — Does the output read naturally in the target language?
3. **Cultural Appropriateness** — Are culturally significant terms handled correctly?
4. **Terminology Correctness** — Are key Maasai terms preserved and not flattened?
5. **Orthographic Consistency** — Is spelling stable and recognizable?

### Process
- Sample 50-100 outputs from test set
- Have native Maa speakers rate each dimension (1-5 scale)
- Focus especially on cultural term handling
- Document disagreements and edge cases

## Error Categories to Track

- Hallucinated vocabulary
- Omitted content
- Over-literal phrasing
- Cultural term flattening
- Wrong lexical choice
- Spelling inconsistency
- Number/date mistakes
- Named entity handling issues

## Key Principle

For low-resource language projects, **human review and terminology accuracy matter more than BLEU alone**.
