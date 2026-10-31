"""
Groq-hosted LLM and speech-to-text client (OpenAI-compatible API).
Replaces the local Ollama engine so the backend runs on any container host without a GPU.
No silent canned fallback: failures raise LLMServiceError with an actionable hint for the caller.
"""
import json
import logging
import time
from typing import Any, Dict, Iterator, List, Optional

import httpx

from backend.config import settings

logger = logging.getLogger("kai_llm_service")

_MAX_RATE_LIMIT_RETRIES = 2
_MAX_RETRY_WAIT_SECONDS = 10.0


class LLMServiceError(Exception):
    """Raised when Groq is unconfigured, unreachable, rate-limited past retries, or returns an error."""
    def __init__(self, message: str, diagnostic_hint: str):
        super().__init__(message)
        self.message = message
        self.diagnostic_hint = diagnostic_hint


def _headers() -> Dict[str, str]:
    if not settings.GROQ_API_KEY:
        raise LLMServiceError(
            message="GROQ_API_KEY is not configured.",
            diagnostic_hint="Create a free key at https://console.groq.com/keys and set GROQ_API_KEY in the backend environment."
        )
    return {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}


def _build_messages(
    system_prompt: str,
    user_message: str,
    conversation_history: Optional[List[Dict[str, str]]],
) -> List[Dict[str, str]]:
    messages = [{"role": "system", "content": system_prompt}]
    for turn in (conversation_history or [])[-4:]:
        role = "user" if turn.get("role") in ("user", "human") else "assistant"
        content = (turn.get("content") or "").strip()
        lower_c = content.lower()
        # Skip the static welcome card so the model isn't primed to echo it back.
        if content and not lower_c.startswith(("welcome", "**welcome")) and "chief of staff" not in lower_c:
            messages.append({"role": role, "content": content[:1500]})
    messages.append({"role": "user", "content": user_message})
    return messages


def _chat_payload(
    messages: List[Dict[str, str]],
    model: Optional[str],
    temperature: float,
    max_tokens: Optional[int],
    stream: bool,
    json_mode: bool,
) -> Dict[str, Any]:
    target_model = model or settings.GROQ_MODEL
    payload: Dict[str, Any] = {
        "model": target_model,
        "messages": messages,
        "temperature": temperature,
        "max_completion_tokens": max_tokens or 2048,
        "stream": stream,
    }
    if target_model.startswith("openai/gpt-oss"):
        # Reasoning tokens count toward max_completion_tokens; keep them small so answers aren't truncated.
        payload["reasoning_effort"] = "low"
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    return payload


def _retry_wait(response: httpx.Response, attempt: int) -> Optional[float]:
    """Seconds to wait before retrying a 429, or None when retries are exhausted."""
    if attempt >= _MAX_RATE_LIMIT_RETRIES:
        return None
    try:
        wait = float(response.headers.get("retry-after", ""))
    except ValueError:
        wait = 2.0 * (attempt + 1)
    return min(wait, _MAX_RETRY_WAIT_SECONDS)


def _raise_for_status(response: httpx.Response, model: str) -> None:
    if response.status_code == 429:
        raise LLMServiceError(
            message="Groq rate limit reached.",
            diagnostic_hint="The free tier allows a limited number of requests per minute and per day. Retry shortly or upgrade the Groq plan."
        )
    if response.status_code in (401, 403):
        raise LLMServiceError(
            message="Groq rejected the API key.",
            diagnostic_hint="Check GROQ_API_KEY in the backend environment."
        )
    if response.status_code == 404:
        raise LLMServiceError(
            message=f"Groq model '{model}' was not found.",
            diagnostic_hint="Set GROQ_MODEL to a model listed at https://console.groq.com/docs/models."
        )
    raise LLMServiceError(
        message=f"Groq API returned HTTP {response.status_code}: {response.text[:250]}",
        diagnostic_hint="Check https://groqstatus.com and the backend logs."
    )


def _post_with_retries(client: httpx.Client, url: str, **kwargs) -> httpx.Response:
    for attempt in range(_MAX_RATE_LIMIT_RETRIES + 1):
        response = client.post(url, **kwargs)
        if response.status_code != 429:
            return response
        wait = _retry_wait(response, attempt)
        if wait is None:
            return response
        logger.warning(f"Groq rate limited; retrying in {wait:.1f}s (attempt {attempt + 1}).")
        time.sleep(wait)
    return response


def query_llm_chat(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    max_tokens: Optional[int] = None,
    json_mode: bool = False,
) -> str:
    """Returns the assistant's reply text. Raises LLMServiceError on any failure."""
    headers = _headers()
    payload = _chat_payload(
        _build_messages(system_prompt, user_message, conversation_history),
        model, temperature, max_tokens, stream=False, json_mode=json_mode,
    )
    url = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    try:
        with httpx.Client(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            response = _post_with_retries(client, url, json=payload, headers=headers)
    except httpx.TimeoutException:
        raise LLMServiceError(
            message=f"Groq request timed out after {settings.LLM_TIMEOUT_SECONDS}s.",
            diagnostic_hint="Retry, or raise LLM_TIMEOUT_SECONDS."
        )
    except httpx.HTTPError as ex:
        raise LLMServiceError(
            message=f"Could not reach Groq: {ex}",
            diagnostic_hint="Check outbound network access from the backend host."
        )

    if response.status_code != 200:
        _raise_for_status(response, payload["model"])
    content = (response.json().get("choices") or [{}])[0].get("message", {}).get("content") or ""
    content = content.strip()
    if not content:
        raise LLMServiceError(
            message="Groq returned an empty response.",
            diagnostic_hint="Raise max_tokens or try a different GROQ_MODEL."
        )
    return content


def query_llm_chat_stream(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    max_tokens: Optional[int] = None,
) -> Iterator[str]:
    """Yields reply tokens as Groq streams them (server-sent events). Raises LLMServiceError."""
    headers = _headers()
    payload = _chat_payload(
        _build_messages(system_prompt, user_message, conversation_history),
        model, temperature, max_tokens, stream=True, json_mode=False,
    )
    url = f"{settings.GROQ_BASE_URL.rstrip('/')}/chat/completions"
    try:
        with httpx.Client(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    response.read()
                    _raise_for_status(response, payload["model"])
                for line in response.iter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[len("data:"):].strip()
                    if data == "[DONE]":
                        return
                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    token = (chunk.get("choices") or [{}])[0].get("delta", {}).get("content")
                    if token:
                        yield token
    except httpx.TimeoutException:
        raise LLMServiceError(
            message=f"Groq streaming timed out after {settings.LLM_TIMEOUT_SECONDS}s.",
            diagnostic_hint="Retry, or raise LLM_TIMEOUT_SECONDS."
        )
    except httpx.HTTPError as ex:
        raise LLMServiceError(
            message=f"Could not reach Groq: {ex}",
            diagnostic_hint="Check outbound network access from the backend host."
        )


def transcribe_audio(
    audio_bytes: bytes,
    filename: str,
    language: Optional[str] = "en",
    prompt: Optional[str] = None,
) -> str:
    """Transcribes an audio file with Groq Whisper and returns the text. Raises LLMServiceError."""
    headers = _headers()
    data: Dict[str, str] = {"model": settings.GROQ_TRANSCRIPTION_MODEL, "response_format": "json", "temperature": "0"}
    if language:
        data["language"] = language
    if prompt:
        data["prompt"] = prompt[:800]
    url = f"{settings.GROQ_BASE_URL.rstrip('/')}/audio/transcriptions"
    try:
        with httpx.Client(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            response = _post_with_retries(
                client, url, data=data, files={"file": (filename, audio_bytes)}, headers=headers
            )
    except httpx.HTTPError as ex:
        raise LLMServiceError(
            message=f"Could not reach Groq for transcription: {ex}",
            diagnostic_hint="Check outbound network access from the backend host."
        )
    if response.status_code == 413:
        raise LLMServiceError(
            message="Audio file is too large for Groq transcription.",
            diagnostic_hint="Record shorter notes or compress the audio (the free tier caps upload size)."
        )
    if response.status_code != 200:
        _raise_for_status(response, settings.GROQ_TRANSCRIPTION_MODEL)
    return (response.json().get("text") or "").strip()


def check_llm_status() -> Dict[str, Any]:
    """Reports whether Groq is configured and reachable, and which models are in use."""
    status: Dict[str, Any] = {
        "provider": "groq",
        "configured": bool(settings.GROQ_API_KEY),
        "chat_model": settings.GROQ_MODEL,
        "transcription_model": settings.GROQ_TRANSCRIPTION_MODEL,
    }
    if not settings.GROQ_API_KEY:
        return {**status, "reachable": False, "error": "GROQ_API_KEY is not configured."}
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{settings.GROQ_BASE_URL.rstrip('/')}/models", headers=_headers())
        if resp.status_code != 200:
            return {**status, "reachable": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        models = [m.get("id") for m in resp.json().get("data", []) if m.get("id")]
        return {
            **status,
            "reachable": True,
            "chat_model_available": settings.GROQ_MODEL in models,
            "transcription_model_available": settings.GROQ_TRANSCRIPTION_MODEL in models,
        }
    except httpx.HTTPError as ex:
        return {**status, "reachable": False, "error": str(ex)}
