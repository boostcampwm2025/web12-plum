FROM python:3.10-slim

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# 파이썬 라이브러리 설치
RUN pip install --no-cache-dir faster-whisper fastapi uvicorn

# 모델 미리 다운로드 (COPY main.py 보다 위에 두어야 코드 수정 시 모델을 다시 안 받음)
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')"

WORKDIR /app

# 현재 폴더(apps/ai-worker)의 모든 파일을 컨테이너 /app으로 복사
COPY /apps/ai-worker/main.py main.py

EXPOSE 8000

# 기본 실행 명령
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
