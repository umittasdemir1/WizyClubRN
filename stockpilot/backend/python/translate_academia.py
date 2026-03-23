#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import torch
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
except ModuleNotFoundError:
    print(
        json.dumps(
            {
                "error": {
                    "code": "PYTHON_TRANSLATION_DEPENDENCIES_MISSING",
                    "message": "Translation dependencies are missing. Install backend/python/requirements.txt into backend/.venv first.",
                }
            }
        ),
        file=sys.stderr,
        flush=True,
    )
    raise SystemExit(1)


def emit_error(code: str, message: str, exit_code: int = 1) -> None:
    print(json.dumps({"error": {"code": code, "message": message}}), file=sys.stderr, flush=True)
    raise SystemExit(exit_code)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Translate S+Academia transcript cues.")
    parser.add_argument("--input", required=True, help="Path to the translation input JSON file.")
    return parser.parse_args()


def load_payload(input_path: str) -> dict[str, Any]:
    path = Path(input_path)
    if not path.exists():
        emit_error("INVALID_TRANSLATION_INPUT", f"Translation input was not found: {input_path}")

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        emit_error("INVALID_TRANSLATION_INPUT", f"Translation input could not be parsed: {exc}")

    if not isinstance(payload, dict):
        emit_error("INVALID_TRANSLATION_INPUT", "Translation input payload must be a JSON object.")

    texts = payload.get("texts")
    if not isinstance(texts, list) or any(not isinstance(text, str) for text in texts):
        emit_error("INVALID_TRANSLATION_INPUT", "Translation input must contain a text array.")

    model_name = payload.get("model")
    if not isinstance(model_name, str) or not model_name.strip():
        emit_error("INVALID_TRANSLATION_INPUT", "Translation input must contain a model name.")

    payload["model"] = model_name.strip()
    payload["texts"] = texts
    return payload


def translate_texts(model_name: str, texts: list[str]) -> list[str]:
    if not texts:
        return []

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    model.eval()

    translated: list[str] = []
    batch_size = 8

    with torch.inference_mode():
        for start in range(0, len(texts), batch_size):
            batch = texts[start:start + batch_size]
            if not any(text.strip() for text in batch):
                translated.extend([text for text in batch])
                continue

            inputs = tokenizer(batch, return_tensors="pt", padding=True, truncation=True)
            generated = model.generate(**inputs, max_new_tokens=256)
            decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)
            translated.extend(text.strip() if isinstance(text, str) else "" for text in decoded)

    return translated


def main() -> None:
    args = parse_args()
    payload = load_payload(args.input)
    model_name = payload["model"]

    try:
        translations = translate_texts(model_name, payload["texts"])
    except Exception as exc:  # noqa: BLE001
        emit_error("PYTHON_TRANSLATION_FAILED", str(exc))

    print(json.dumps({"model": model_name, "translations": translations}, ensure_ascii=False))


if __name__ == "__main__":
    main()
