## Summary

Describe the change in one or two paragraphs.

## Change Type

- [ ] Bug fix
- [ ] Feature or product enhancement
- [ ] Data update
- [ ] Training or model workflow change
- [ ] CI/CD or repository operations change
- [ ] Documentation only

## Validation

- [ ] `python -m compileall src scripts space kaggle`
- [ ] `python scripts/validate_dataset_complete.py`
- [ ] `python -m unittest discover -s tests -v`
- [ ] Relevant manual checks were run for Space, training, or publishing paths

## Governance Checklist

- [ ] No secrets, tokens, or private credentials were committed
- [ ] Dataset or glossary changes preserve source traceability and governance expectations
- [ ] Operational impacts are documented for GitHub Actions, Kaggle, Hugging Face, or self-hosted runners
- [ ] Documentation was updated when behavior, workflow inputs, or outputs changed

## Deployment Notes

List any required secrets, variables, environment changes, or post-merge actions.
