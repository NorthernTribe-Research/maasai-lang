"""
Model readiness checks and promotion gating for Maasai MT artifacts.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from src.postprocessing import has_english_leakage

WEIGHT_MARKERS = {
    "adapter_model.safetensors",
    "adapter_model.bin",
    "pytorch_model.bin",
    "model.safetensors",
}


@dataclass(frozen=True)
class ReadinessThresholds:
    """Minimum thresholds for a publishable Maa model candidate."""

    min_bleu: float = 10.0
    min_chrf: float = 25.0
    min_term_recall: float = 0.50
    max_english_leakage_rate: float = 0.35
    min_eval_samples: int = 50


def looks_like_placeholder_artifact(path: Path) -> bool:
    """Detect mock or obviously invalid model weight placeholders."""
    try:
        if path.stat().st_size < 1024:
            text = path.read_text(encoding="utf-8", errors="ignore").upper()
            return any(marker in text for marker in ("MOCK_", "PLACEHOLDER", "DUMMY"))
    except OSError:
        return False
    return False


def inspect_model_artifacts(model_dir: Path) -> dict[str, Any]:
    """Inspect model files and distinguish real artifacts from placeholders."""
    info: dict[str, Any] = {
        "state": "missing",
        "real_files": [],
        "placeholder_files": [],
        "model_dir": str(model_dir),
    }

    if not model_dir.exists() or not model_dir.is_dir():
        return info

    for path in model_dir.rglob("*"):
        if not path.is_file():
            continue
        is_weight_file = (
            path.name in WEIGHT_MARKERS
            or path.suffix == ".gguf"
            or (path.name.startswith("model-") and path.suffix == ".safetensors")
        )
        if not is_weight_file:
            continue

        if looks_like_placeholder_artifact(path):
            info["placeholder_files"].append(path.name)
        else:
            info["real_files"].append(path.name)

    if info["real_files"]:
        info["state"] = "real"
    elif info["placeholder_files"]:
        info["state"] = "placeholder"

    return info


def load_json_file(path: Path) -> dict[str, Any] | None:
    """Load a JSON file if present and parseable."""
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def extract_base_model_name(model_dir: Path) -> str | None:
    """Infer the checkpoint lineage from common adapter/model metadata files."""
    for filename, fields in (
        ("adapter_config.json", ("base_model_name_or_path",)),
        ("config.json", ("_name_or_path", "base_model_name_or_path", "model_name_or_path")),
    ):
        payload = load_json_file(model_dir / filename)
        if not payload:
            continue
        for field in fields:
            value = payload.get(field)
            if value:
                return str(value).strip()
    return None


def default_eval_file(model_dir: Path) -> Path:
    """Return the conventional evaluation file location for a local model dir."""
    return model_dir / "eval_results.json"


def resolve_eval_file(model_dir: Path, eval_file: Path | None = None) -> Path:
    """Resolve the evaluation report path."""
    return eval_file if eval_file is not None else default_eval_file(model_dir)


def compute_english_leakage_stats(eval_results: dict[str, Any]) -> dict[str, Any]:
    """Compute English leakage across Maa-target evaluation samples."""
    details = list(eval_results.get("details") or [])
    evaluated = 0
    leaked = 0

    for item in details:
        target_lang = str(item.get("target_lang", "")).strip().lower()
        if target_lang != "mas":
            continue
        hypothesis = str(item.get("hypothesis", "")).strip()
        source_text = str(item.get("source_text", "")).strip()
        if not hypothesis:
            continue

        evaluated += 1
        if has_english_leakage(hypothesis, source_text=source_text, direction="en_to_mas"):
            leaked += 1

    rate = leaked / evaluated if evaluated else None
    return {
        "evaluated_samples": evaluated,
        "leaked_samples": leaked,
        "rate": rate,
    }


def build_model_readiness_report(
    model_dir: Path,
    *,
    eval_file: Path | None = None,
    thresholds: ReadinessThresholds | None = None,
) -> dict[str, Any]:
    """Build a machine-readable readiness report for a model candidate."""
    thresholds = thresholds or ReadinessThresholds()
    artifacts = inspect_model_artifacts(model_dir)
    base_model_name = extract_base_model_name(model_dir)
    eval_path = resolve_eval_file(model_dir, eval_file)
    eval_results = load_json_file(eval_path)

    checks: dict[str, dict[str, Any]] = {}

    def add_check(name: str, ok: bool, detail: str, *, required: bool = True) -> None:
        checks[name] = {
            "ok": bool(ok),
            "detail": detail,
            "required": required,
        }

    add_check(
        "real_artifacts",
        artifacts["state"] == "real",
        f"artifact_state={artifacts['state']}",
    )

    lineage_ok = bool(base_model_name and "gemma-4" in base_model_name.lower())
    add_check(
        "gemma4_lineage",
        lineage_ok,
        f"base_model={base_model_name or 'unknown'}",
    )

    evaluation_present = eval_results is not None
    add_check(
        "evaluation_present",
        evaluation_present,
        f"eval_file={eval_path}",
    )

    leakage_stats = {
        "evaluated_samples": 0,
        "leaked_samples": 0,
        "rate": None,
    }

    if evaluation_present:
        bleu = float(eval_results.get("bleu", 0.0) or 0.0)
        chrf = float(eval_results.get("chrf++", 0.0) or 0.0)
        num_samples = int(eval_results.get("num_samples", 0) or 0)
        terminology = eval_results.get("terminology") or {}
        term_recall = terminology.get("term_recall")
        term_recall_value = float(term_recall) if term_recall is not None else None
        leakage_stats = compute_english_leakage_stats(eval_results)
        leakage_rate = leakage_stats["rate"]

        add_check(
            "evaluation_sample_count",
            num_samples >= thresholds.min_eval_samples,
            f"samples={num_samples}, min={thresholds.min_eval_samples}",
        )
        add_check(
            "bleu_threshold",
            bleu >= thresholds.min_bleu,
            f"bleu={bleu:.2f}, min={thresholds.min_bleu:.2f}",
        )
        add_check(
            "chrf_threshold",
            chrf >= thresholds.min_chrf,
            f"chrf={chrf:.2f}, min={thresholds.min_chrf:.2f}",
        )
        add_check(
            "terminology_threshold",
            term_recall_value is not None and term_recall_value >= thresholds.min_term_recall,
            (
                f"term_recall={term_recall_value:.4f}, min={thresholds.min_term_recall:.4f}"
                if term_recall_value is not None
                else "term_recall=missing"
            ),
        )
        add_check(
            "english_leakage_threshold",
            leakage_rate is not None and leakage_rate <= thresholds.max_english_leakage_rate,
            (
                f"leakage_rate={leakage_rate:.4f}, max={thresholds.max_english_leakage_rate:.4f}, "
                f"evaluated={leakage_stats['evaluated_samples']}"
                if leakage_rate is not None
                else "leakage_rate=missing"
            ),
        )

    failed_required_checks = [
        f"{name}: {payload['detail']}"
        for name, payload in checks.items()
        if payload["required"] and not payload["ok"]
    ]

    ready = not failed_required_checks
    return {
        "ready": ready,
        "model_dir": str(model_dir),
        "eval_file": str(eval_path),
        "base_model_name": base_model_name,
        "artifact_state": artifacts["state"],
        "artifacts": artifacts,
        "thresholds": asdict(thresholds),
        "checks": checks,
        "reasons": failed_required_checks,
        "warnings": [],
        "evaluation": eval_results or {},
        "english_leakage": leakage_stats,
    }


def write_model_readiness_report(path: Path, report: dict[str, Any]) -> None:
    """Persist a readiness report as JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
