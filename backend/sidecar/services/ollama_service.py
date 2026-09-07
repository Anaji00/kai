import logging
import httpx
from typing import Dict, Any, List, Optional
from backend.config import settings

logger = logging.getLogger("kai_ollama_service")


class OllamaServiceError(Exception):
    """Raised when Ollama is unreachable or encounters an error during generation."""
    def __init__(self, message: str, diagnostic_hint: str):
        super().__init__(message)
        self.message = message
        self.diagnostic_hint = diagnostic_hint


def get_available_models(base_url: str) -> List[str]:
    """Retrieves installed model names from Ollama /api/tags."""
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{base_url}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                return [m.get("name") for m in data.get("models", []) if m.get("name")]
    except Exception as e:
        logger.debug(f"Failed to query Ollama tags: {e}")
    return []


def resolve_best_model(base_url: str, preferred: Optional[str] = None) -> str:
    """
    Dynamically finds the best available model.
    Prioritizes:
    1. Exact or partial match for preferred model (e.g. qwen2.5:7b)
    2. Any installed Qwen model (e.g. qwen3:14b, qwen2.5:latest)
    3. First available installed model (e.g. llama3.1:8b)
    4. Fallback to preferred or settings.OLLAMA_MODEL
    """
    target = preferred or settings.OLLAMA_MODEL
    installed = get_available_models(base_url)
    if not installed:
        return target

    # Exact or prefix match
    for m in installed:
        if m == target or target in m or m.startswith(target):
            return m

    # Any Qwen model
    qwen_models = [m for m in installed if "qwen" in m.lower()]
    if qwen_models:
        logger.info(f"Preferred model '{target}' not found. Dynamically selected Qwen model: '{qwen_models[0]}'")
        return qwen_models[0]

    # First installed model
    logger.warning(f"No Qwen models found. Falling back to installed model: '{installed[0]}'")
    return installed[0]


def check_ollama_status() -> Dict[str, Any]:
    """
    Checks if Ollama service is reachable and retrieves installed models.
    """
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{base_url}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                target_model = settings.OLLAMA_MODEL
                active_model = resolve_best_model(base_url, target_model)
                model_loaded = any(target_model in m for m in models)
                return {
                    "reachable": True,
                    "available_models": models,
                    "target_model": target_model,
                    "active_model": active_model,
                    "target_model_ready": model_loaded or len(models) > 0
                }
            return {
                "reachable": False,
                "error": f"HTTP {resp.status_code}: {resp.text[:200]}"
            }
    except Exception as e:
        return {
            "reachable": False,
            "error": str(e)
        }


def query_ollama_chat(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    num_predict: Optional[int] = None
) -> str:
    """
    Directly dispatches prompt to Ollama's /api/chat endpoint using Qwen.
    STRICT USER REQUIREMENT: ZERO SILENT FALLBACK TO CANNED DETERMINISTIC RESPONSES.
    If Ollama is offline or encounters an error, raises OllamaServiceError with actionable diagnostics.
    """
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    target_model = resolve_best_model(base_url, model or settings.OLLAMA_MODEL)
    chat_url = f"{base_url}/api/chat"

    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        # Take up to the last 4 messages, bounded to 300 characters each to preserve token budget
        for turn in conversation_history[-4:]:
            role = "user" if turn.get("role") in ["user", "human"] else "assistant"
            content = turn.get("content", "").strip()
            lower_c = content.lower()
            # Do not inject repetitive welcome card into conversation turns to avoid priming the model to echo it
            if content and not lower_c.startswith("welcome") and not lower_c.startswith("**welcome") and "chief of staff" not in lower_c and "clinical somatic assistant" not in lower_c:
                messages.append({"role": role, "content": content[:300]})
    messages.append({"role": "user", "content": user_message})

    prediction_limit = num_predict if num_predict is not None else 1024

    payload = {
        "model": target_model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "top_p": 0.9,
            "num_predict": prediction_limit,
            "num_ctx": 4096
        }
    }

    try:
        with httpx.Client(timeout=settings.OLLAMA_TIMEOUT_SECONDS) as client:
            response = client.post(chat_url, json=payload)
            if response.status_code == 200:
                data = response.json()
                content = data.get("message", {}).get("content", "").strip()
                if not content:
                    raise OllamaServiceError(
                        message="Ollama returned an empty response.",
                        diagnostic_hint=f"Verify model '{target_model}' is functioning properly."
                    )
                return content
            elif response.status_code == 404:
                raise OllamaServiceError(
                    message=f"Model '{target_model}' not found in local Ollama.",
                    diagnostic_hint=f"Run `ollama pull {target_model}` or `ollama run {target_model}` in your terminal to download it."
                )
            else:
                raise OllamaServiceError(
                    message=f"Ollama API returned HTTP {response.status_code}: {response.text[:250]}",
                    diagnostic_hint=f"Check Ollama server logs at {base_url}."
                )
    except httpx.ConnectError:
        raise OllamaServiceError(
            message=f"Could not connect to Ollama at {base_url}.",
            diagnostic_hint=(
                f"Ollama server is not actively running. Start it by opening Ollama on Windows or running "
                f"`ollama run {target_model}` in your terminal."
            )
        )
    except httpx.TimeoutException:
        raise OllamaServiceError(
            message=f"Ollama query timed out after {settings.OLLAMA_TIMEOUT_SECONDS} seconds.",
            diagnostic_hint=(
                f"The model '{target_model}' may be under high memory pressure. "
                f"Consider using a lighter quantized model (e.g. `qwen2.5:3b`) or allocating more RAM/VRAM."
            )
        )
    except OllamaServiceError:
        raise
    except Exception as ex:
        raise OllamaServiceError(
            message=f"Unexpected error communicating with Ollama: {str(ex)}",
            diagnostic_hint="Ensure Ollama is running and accessible from the FastAPI backend."
        )
