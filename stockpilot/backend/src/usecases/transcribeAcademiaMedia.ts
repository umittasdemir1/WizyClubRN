import type {
    TranscribeAcademiaMediaRequest,
    TranscribeAcademiaMediaResponse,
} from "../contracts/academia.js";
import { transcribeAcademiaMediaFile } from "../services/academiaTranscription.js";

export async function transcribeAcademiaMedia(
    request: TranscribeAcademiaMediaRequest
): Promise<TranscribeAcademiaMediaResponse> {
    return transcribeAcademiaMediaFile(request);
}
