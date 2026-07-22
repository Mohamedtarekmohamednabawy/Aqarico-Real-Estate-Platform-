FROM python:3.11

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app
COPY --chown=user . $HOME/app

RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Run FastAPI app, respecting $PORT if provided (default to 7860 for Hugging Face)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
