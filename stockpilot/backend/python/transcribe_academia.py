#!/usr/bin/env python3
import argparse
import json
import math
import os
import sys
from typing import Any

WORKER_STATUS_PREFIX = "ACADEMIA_STATUS "


def emit_error(code: str, message: str, exit_code: int = 1) -> None:
    print(json.dumps({"error": {"code": code, "message": message}}), file=sys.stderr, flush=True)
    raise SystemExit(exit_code)


def emit_status(phase: str, progress_percent: int, message: str, source_name: str) -> None:
    print(
        f"{WORKER_STATUS_PREFIX}" + json.dumps(
            {
                "phase": phase,
                "progressPercent": progress_percent,
                "message": message,
                "sourceName": source_name,
            },
            ensure_ascii=True,
        ),
        file=sys.stderr,
        flush=True,
    )


try:
    from faster_whisper import WhisperModel
except ModuleNotFoundError:
    emit_error(
        "PYTHON_DEPENDENCIES_MISSING",
        "faster-whisper is not installed for the selected Python runtime. Install backend/python/requirements.txt into backend/.venv first.",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transcribe S+Academia lesson media with faster-whisper.")
    parser.add_argument("--file", required=True, help="Absolute path to the uploaded media file.")
    parser.add_argument("--name", required=True, help="Original filename used only for metadata.")
    parser.add_argument("--kind", required=True, choices=["audio", "video"], help="Media kind.")
    return parser.parse_args()


def env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        parsed = int(raw)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def compute_transcription_progress(segment_end: float, total_duration: float | None) -> int:
    if total_duration is None or not math.isfinite(total_duration) or total_duration <= 0:
        return 78

    ratio = max(0.0, min(1.0, segment_end / total_duration))
    return min(96, max(72, round(72 + (ratio * 24))))


def build_payload(model: WhisperModel, file_path: str, source_name: str) -> dict[str, Any]:
    model_name = os.environ.get("FASTER_WHISPER_MODEL", "tiny").strip() or "tiny"
    beam_size = env_int("FASTER_WHISPER_BEAM_SIZE", 1)
    vad_filter = env_bool("FASTER_WHISPER_VAD_FILTER", True)

    emit_status("transcription_started", 68, "Transcription started.", source_name)
    segments, info = model.transcribe(
        file_path,
        beam_size=beam_size,
        vad_filter=vad_filter,
        word_timestamps=True,
    )

    duration = getattr(info, "duration", None)
    emit_status("transcribing", 72, "Audio decoded. Building transcript.", source_name)

    collected_segments = []
    text_parts = []
    last_reported_progress = 72
    for segment in segments:
        text = (segment.text or "").strip()
        segment_words = []
        for word in getattr(segment, "words", []) or []:
            word_text = getattr(word, "word", "") or ""
            word_start = getattr(word, "start", None)
            word_end = getattr(word, "end", None)
            if word_start is None or word_end is None or not word_text.strip():
                continue
            segment_words.append(
                {
                    "start": float(word_start),
                    "end": float(word_end),
                    "text": str(word_text),
                }
            )

        if text:
            collected_segments.append(
                {
                    "start": float(segment.start),
                    "end": float(segment.end),
                    "text": text,
                    "words": segment_words,
                }
            )
            text_parts.append(text)

        progress_source = segment_words[-1]["end"] if segment_words else float(segment.end)
        progress = compute_transcription_progress(progress_source, duration)
        if progress >= last_reported_progress + 1:
            emit_status("transcribing", progress, "Transcribing…", source_name)
            last_reported_progress = progress

    emit_status("transcribing", 96, "Finalizing transcript output.", source_name)

    return {
        "model": model_name,
        "language": getattr(info, "language", None),
        "duration": duration,
        "text": " ".join(text_parts).strip(),
        "segments": collected_segments,
    }


def main() -> None:
    args = parse_args()
    file_path = os.path.abspath(args.file)
    if not os.path.exists(file_path):
        emit_error("MEDIA_FILE_MISSING", f"Uploaded media file was not found: {file_path}")

    model_name = os.environ.get("FASTER_WHISPER_MODEL", "tiny").strip() or "tiny"
    device = os.environ.get("FASTER_WHISPER_DEVICE", "cpu").strip() or "cpu"
    compute_type = os.environ.get("FASTER_WHISPER_COMPUTE_TYPE", "int8").strip() or "int8"

    emit_status("model_loading", 46, f"Loading {model_name} model on {device}.", args.name)

    try:
        model = WhisperModel(model_name, device=device, compute_type=compute_type)
        emit_status("model_loading", 60, "Model loaded. Preparing media.", args.name)
        payload = build_payload(model, file_path, args.name)
    except Exception as exc:  # noqa: BLE001
        emit_error("FASTER_WHISPER_FAILED", str(exc))

    print(json.dumps(payload, ensure_ascii=True))


if __name__ == "__main__":
    main()
