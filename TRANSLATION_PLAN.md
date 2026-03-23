## Stockpilot Transcript Translation Plan

### Purpose
- Add transcript translation to `stockpilot` without breaking the current Faster Whisper transcription flow.
- Ship only Phase 1 now: `en -> tr`.
- Keep the rest as a documented follow-up.

### What Was Implemented
- Added a backend transcript translation service.
- Added a backend translation endpoint.
- Added a local Python translation worker.
- Added frontend transcript language toggle for Turkish.
- Added frontend local cache for translated transcript results.
- Kept original transcript flow intact.
- Kept translated transcript at cue level only.
- Explicitly disabled translated word-level highlighting by returning translated cues with empty `words` arrays.

### Phase 1 Scope
- Supported source language: English only
- Supported target language: Turkish only
- Supported pair: `en -> tr`
- No other translation pairs are active yet.

### Final Model Choice For Phase 1
- Translation model used in code: `Helsinki-NLP/opus-tatoeba-en-tr`
- Why this model:
  - available on Hugging Face
  - local/self-host friendly
  - smaller and more practical than NLLB/MADLAD for current local backend setup
- Important:
  - earlier planning discussed `opus-mt-en-tr`
  - actual working model id is `Helsinki-NLP/opus-tatoeba-en-tr`

### Architecture
- Existing transcription path stays separate.
- Faster Whisper still generates:
  - transcript text
  - cue list
  - word timestamps
  - VTT
- Translation happens after transcription.
- Translation is done per cue text.
- Cue timestamps are preserved from source transcript.
- Translated cues return `words: []` so UI does not try to do translated word sync.

### UX Behavior Implemented
- If transcript source language is English, the transcript panel shows a language toggle.
- Toggle options:
  - `Original`
  - `Turkish`
- When user selects `Turkish`:
  - frontend requests translated transcript from backend
  - translated transcript is cached locally
  - transcript panel switches to translated cue text
  - player caption overlay also uses translated cue text
- If transcript is not English:
  - Turkish toggle is not shown

### Files Added
- [/home/user/WizyClubRN/TRANSLATION_PLAN.md](/home/user/WizyClubRN/TRANSLATION_PLAN.md)
- [/home/user/WizyClubRN/stockpilot/backend/src/services/academiaTranslation.ts](/home/user/WizyClubRN/stockpilot/backend/src/services/academiaTranslation.ts)
- [/home/user/WizyClubRN/stockpilot/backend/python/translate_academia.py](/home/user/WizyClubRN/stockpilot/backend/python/translate_academia.py)

### Files Updated
- [/home/user/WizyClubRN/stockpilot/backend/src/routes/academia.ts](/home/user/WizyClubRN/stockpilot/backend/src/routes/academia.ts)
- [/home/user/WizyClubRN/stockpilot/backend/src/contracts/academia.ts](/home/user/WizyClubRN/stockpilot/backend/src/contracts/academia.ts)
- [/home/user/WizyClubRN/stockpilot/backend/src/services/academiaTranscription.ts](/home/user/WizyClubRN/stockpilot/backend/src/services/academiaTranscription.ts)
- [/home/user/WizyClubRN/stockpilot/backend/python/requirements.txt](/home/user/WizyClubRN/stockpilot/backend/python/requirements.txt)
- [/home/user/WizyClubRN/stockpilot/backend/tests/academia.test.mjs](/home/user/WizyClubRN/stockpilot/backend/tests/academia.test.mjs)
- [/home/user/WizyClubRN/stockpilot/frontend/src/services/api.ts](/home/user/WizyClubRN/stockpilot/frontend/src/services/api.ts)
- [/home/user/WizyClubRN/stockpilot/frontend/src/studio/modules/academia/AcademiaModule.tsx](/home/user/WizyClubRN/stockpilot/frontend/src/studio/modules/academia/AcademiaModule.tsx)
- [/home/user/WizyClubRN/stockpilot/frontend/src/studio/modules/academia/components/AcademiaTranscriptPanel.tsx](/home/user/WizyClubRN/stockpilot/frontend/src/studio/modules/academia/components/AcademiaTranscriptPanel.tsx)
- [/home/user/WizyClubRN/stockpilot/frontend/src/studio/modules/academia/cache.ts](/home/user/WizyClubRN/stockpilot/frontend/src/studio/modules/academia/cache.ts)
- [/home/user/WizyClubRN/stockpilot/frontend/src/studio/modules/academia/constants.ts](/home/user/WizyClubRN/stockpilot/frontend/src/studio/modules/academia/constants.ts)

### Backend API Added
- New endpoint: `POST /api/academia/translate`
- Request body:
```json
{
  "transcript": { "...existing transcript payload...": true },
  "targetLanguage": "tr"
}
```
- Response:
  - same transcript result shape
  - but `language` becomes `tr`
  - translated `cues` are returned
  - `words` arrays are empty

### Backend Translation Service Behavior
- Validates source and target language.
- Allows only supported pairs defined in `SUPPORTED_TRANSLATION_MODELS`.
- Builds cue text array from source transcript.
- Calls Python translation worker.
- Rebuilds translated transcript result with:
  - same cue timing
  - translated cue text
  - empty word arrays
  - translated VTT regenerated from translated cues

### Frontend Behavior Added
- New translation API helper was added.
- Local translation cache was added per file + target language.
- Transcript panel now supports language switching.
- Frontend only allows Turkish toggle when source transcript language is English.
- Translation request is lazy:
  - not precomputed immediately
  - only requested when user clicks Turkish
- Once fetched, Turkish translation is cached and reused.

### Local Machine Problem Encountered
- `/home` volume was full.
- Initial Python dependency install failed with `No space left on device`.
- The original partial backend virtualenv under `/home` was removed safely.
- A new backend virtualenv was created under `/tmp` instead.
- `stockpilot/backend/.venv` was re-pointed as a symlink to the `/tmp` virtualenv.
- Model cache was also redirected to `/tmp`.

### Current Local Machine Runtime Layout
- Backend venv path actually used now:
  - `/tmp/stockpilot-backend-venv`
- Project-visible venv path:
  - `stockpilot/backend/.venv` -> symlink to `/tmp/stockpilot-backend-venv`
- Model cache path:
  - `/tmp/stockpilot-model-cache`

### Important Temporary Infrastructure Note
- This machine is currently using `/tmp` for the Python venv and model cache.
- `/tmp` may be cleared on reboot or environment reset.
- If that happens:
  - the symlink may still exist
  - but the actual environment/model files may be gone
- In that case the setup must be recreated.

### Python Requirements Used Now
- `faster-whisper==1.2.1`
- `sentencepiece==0.2.0`
- `torch==2.5.1+cpu`
- `transformers==4.46.3`
- Extra PyTorch CPU wheel index is configured in `requirements.txt`

### Why CPU-Only Torch Was Chosen
- Initial install started pulling large CUDA wheels.
- That was unnecessary for this local setup.
- It also made disk usage worse.
- The requirements were changed to CPU-only torch to keep setup smaller and safer.

### Cache Routing Added In Code
- To avoid writing Hugging Face model cache under a full `/home` directory, worker env now sets:
  - `HF_HOME`
  - `TRANSFORMERS_CACHE`
  - `XDG_CACHE_HOME`
- Default model cache directory in code:
  - `/tmp/stockpilot-model-cache`
- Optional override env:
  - `STOCKPILOT_MODEL_CACHE_DIR`

### Validation Completed On This Machine
- Backend build passed.
- Frontend build passed.
- Backend transcript/translation tests passed.
- Python import verification passed for:
  - `faster_whisper`
  - `torch`
  - `transformers`
- Real translation smoke test passed:
  - input: `Welcome to StockPilot.`
  - output: `StockPilot'a hoş geldiniz.`

### Commands That Were Effectively Verified
- Backend build:
  - `npm run build` in `stockpilot/backend`
- Frontend build:
  - `npm run build` in `stockpilot/frontend`
- Backend tests:
  - `node --test tests/academia.test.mjs` in `stockpilot/backend`
- Python package import check:
  - import of `faster_whisper`, `torch`, `transformers`
- Translation smoke test:
  - direct run of `translate_academia.py` with `Helsinki-NLP/opus-tatoeba-en-tr`

### What Another Machine Must Do
- Clone or open the same repo state.
- Ensure Node dependencies are installed for backend and frontend.
- Ensure Python 3.11 is available.
- Create backend venv.
- Install backend Python requirements.
- Make sure enough disk exists for:
  - Python environment
  - Hugging Face model downloads
- Prefer a non-full volume for Python env and model cache.

### Recommended Setup On Another Machine
1. Install backend npm dependencies if missing.
2. Install frontend npm dependencies if missing.
3. In `stockpilot/backend`, run the setup flow.
4. If the machine has enough permanent disk space, keep `.venv` inside project normally.
5. If the machine has a small home volume, use a custom location for venv and model cache.

### Recommended Environment Variables On Another Machine
- `STOCKPILOT_MODEL_CACHE_DIR`
  - set this to a disk path with enough free space
  - recommended if home directory is small
- `STOCKPILOT_PYTHON_BIN`
  - optional override for backend Python interpreter
- `STOCKPILOT_PYTHON_LIBRARY_PATH`
  - optional, mainly needed in nix/shared-lib edge cases
- `FASTER_WHISPER_MODEL`
  - optional transcription model override
- `FASTER_WHISPER_DEVICE`
  - optional, currently expected to stay `cpu`
- `FASTER_WHISPER_COMPUTE_TYPE`
  - optional, currently expected to stay lightweight

### Safe Rebuild Procedure On Another Machine
1. Go to `stockpilot/backend`
2. Create or recreate the Python venv
3. Install `backend/python/requirements.txt`
4. If disk is tight, put venv and model cache on a larger volume
5. Run backend build and tests
6. Run one translation smoke test before using UI

### If Another Machine Also Has Low Disk Space
- Do not install model cache into the user home directory.
- Put these on a larger disk or temp volume:
  - Python venv
  - Hugging Face cache
- If needed, symlink `stockpilot/backend/.venv` to that external location.
- Also set `STOCKPILOT_MODEL_CACHE_DIR` to that larger location.

### Known Functional Limitations In Phase 1
- Only `en -> tr` is supported.
- Turkish translation is on-demand, not background pre-generated.
- Translated transcript does not have word-level timing.
- UI uses cue-level translated display only.
- If source language is not English, Turkish translation toggle does not appear.

### Planned Next Phases
- Add `en -> el`
- Add `en -> fr`
- Add `en -> it`
- Add `en -> ar`
- Add `tr -> en`
- Add `tr -> el/fr/it/ar` via English pivot
- Possibly precompute translations after transcript generation if UX latency becomes noticeable

### Suggested Future Improvements
- Persist translation results server-side instead of frontend-only cache.
- Add translation status caching on backend.
- Add request deduplication for repeated Turkish translation requests.
- Add optional background warmup for the translation model.
- Replace `/tmp` runtime layout with a permanent model/venv location on machines with stable storage.

### Current Status
- Phase 1 code is implemented.
- Phase 1 local environment is working on this machine.
- Local environment depends on `/tmp` for venv and model cache.
- Another machine will need Python setup plus model cache setup before this works there.
