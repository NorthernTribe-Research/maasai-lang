# TODO

## Immediate

- [x] Make `google/gemma-4-E4B-it` the project base-model direction across training, inference, and Space defaults.
- [x] Add continual-training control paths for GitHub Actions, Kaggle, Hugging Face checkpoint resume, and persistent cloud CPU orchestration.
- [x] Add mobile-focused Space fixes so the app is usable on phones, tablets, and desktop screens.
- [x] Add Maa generation tasks derived from aligned data so the model learns to compose, not only translate.
- [x] Add Bible passage-generation tasks from aligned scripture windows.
- [x] Add Bible cross-reference generation tasks so related verses act as semantic context for a primary Maa target.
- [x] Reduce GitHub Actions artifact retention pressure so high-frequency workflows stop filling storage unnecessarily.
- [x] Restore GitHub Pages availability by switching the public site to a branch-based `gh-pages` source and queueing a fresh Pages build.
- [x] Add a model-readiness gate so promotion requires a real Gemma checkpoint plus evaluation evidence.

## Next

- [ ] Reconcile and republish the live Hugging Face model repo so the Space serves real Gemma-based inference instead of any fallback/demo behavior.
- [ ] Verify the published model lineage is Gemma 4 end-to-end, not mixed with older placeholder adapter metadata.
- [ ] Make the publish path require a passing readiness report in the live release run, not only in local/operator flows.
- [ ] Turn the cloud CPU backend on for real once SSH authentication from this workstation is accepted by the remote host.
- [ ] Push the validated repo state to GitHub and then sync the updated Space/model path to Hugging Face and Kaggle.

## Data Expansion

- [ ] Ingest the newly identified approved Maa speech source from the University of Iowa with provenance metadata.
- [ ] Add controlled, file-level review for BibleNLP Maa material before any training ingest because the corpus has mixed rights metadata.
- [ ] Review Global Storybooks and African Storybook Maa content story-by-story and only promote clearly reusable items.
- [ ] Request access to ANV Maasai speech and review consent and downstream-use constraints before ingestion.
- [ ] Keep the University of Oregon Maa language project in a permission-first lane until explicit reuse approval exists.

## Continual Learning

- [ ] Add a teacher-driven self-distillation and backtranslation lane with strict promotion gates.
- [ ] Add periodic lexical expansion from vetted glossaries into the Engram layer with regression tests.
- [ ] Add evaluation slices for fluency, adequacy, Biblical register, and non-Biblical Maa generation quality.
- [ ] Add checkpoint promotion logic so only runs that improve held-out metrics become the primary published model.
- [ ] Expand Maa composition tasks beyond Bible and story data into governance, health, education, markets, and daily-life domains.

## Operations

- [ ] Keep `Platform Health`, `Training Freshness`, and source-intelligence workflows green.
- [ ] Keep the new `gh-pages` deployment path in sync while the workflow-based Pages artifact path remains quota-sensitive.
- [ ] Document exact publish order for `GitHub -> Kaggle -> Hugging Face model -> Hugging Face Space`.
- [ ] Confirm the Space, repo docs, and monitoring endpoints are all reachable from both desktop and mobile browsers.
