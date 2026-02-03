from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from faster_whisper import WhisperModel
import os

app = FastAPI()

CPU_THREADS = int(os.getenv("STT_CPU_THREADS", "1"))
BEAM_SIZE = int(os.getenv("STT_BEAM_SIZE", "1"))

# CPU 환경 최적화 설정
# cpu_threads를 서버 코어 수의 절반 정도로 설정하는 것이 좋습니다.
model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8",
    cpu_threads=CPU_THREADS
)

class STTRequest(BaseModel):
    file_path: str

@app.post("/transcribe")
async def transcribe(request: STTRequest):
    # 1. 받은 바디 값 로그 출력
    print(f"📩 Received STT Request: {request.dict()}")

    if not os.path.exists(request.file_path):
        # 2. 파일이 없을 때 디버깅을 위해 현재 폴더 구조 출력
        parent_dir = os.path.dirname(request.file_path) or "."
        print(f"❌ File not found: {request.file_path}")

        try:
            files_in_dir = os.listdir(parent_dir)
            print(f"📂 Files available in {parent_dir}: {files_in_dir}")
        except Exception:
            print(f"📂 Parent directory {parent_dir} is also missing or inaccessible.")

        raise HTTPException(
            status_code=404,
            detail=f"File not found: {request.file_path}. Please check Docker Volume Mappings."
        )

    try:
        print(f"🎙️ Starting transcription for: {request.file_path}")
        segments, info = model.transcribe(
          request.file_path,
          beam_size=BEAM_SIZE,
          language="ko"
        )

        results = []
        full_text = ""
        for segment in segments:
            results.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip()
            })
            full_text += segment.text + " "

        print(f"✅ Transcription complete: {len(results)} segments found.")

        return {
            "text": full_text.strip(),
            "segments": results,
            "language": info.language,
            "duration": info.duration
        }
    except Exception as e:
        print(f"🔥 Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
