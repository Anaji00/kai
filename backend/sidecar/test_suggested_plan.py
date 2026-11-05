import json
from unittest import mock

from backend.config import settings
from backend.sidecar.services import llm_service
from backend.sidecar.services.llm_service import LLMServiceError
from backend.sidecar.services.thesis_rag import generate_llm_suggested_plan


def _plan():
    return generate_llm_suggested_plan(
        client_name="Test Guest",
        retreat_id="puerto-vallarta-2027",
        room_preference="private-suite",
        movement_experience="all-levels",
        health_notes="Gluten free.",
        intentions="Recover from burnout.",
    )


def test_plan_calls_the_model_with_its_real_signature(monkeypatch):
    # create_autospec rejects arguments the real function does not accept, which is how this call once
    # failed silently and left every inquiry with the template.
    fake = mock.create_autospec(
        llm_service.query_llm_chat,
        return_value=json.dumps({"summary": "From the model."}),
    )
    monkeypatch.setattr(llm_service, "query_llm_chat", fake)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")

    plan = _plan()

    fake.assert_called_once()
    assert plan["summary"] == "From the model."
    assert plan["generatedBy"].startswith("KAI Live LLM")


def test_plan_falls_back_to_the_template_when_the_model_fails(monkeypatch):
    fake = mock.create_autospec(llm_service.query_llm_chat, side_effect=LLMServiceError("down", "test"))
    monkeypatch.setattr(llm_service, "query_llm_chat", fake)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")

    plan = _plan()

    assert "Test Guest" in plan["summary"]
    assert not plan["generatedBy"].startswith("KAI Live LLM")
