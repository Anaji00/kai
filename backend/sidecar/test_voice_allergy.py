def _stage(admin_client, memo):
    response = admin_client.post("/api/v1/sidecar/intakes/voice-memo", json={"raw_transcript": memo})
    assert response.status_code == 200, response.text
    return admin_client.get(f"/api/v1/sidecar/intakes/{response.json()['intake_id']}").json()


def test_dictated_allergy_reaches_the_clinical_engine(admin_client):
    intake = _stage(admin_client, "Spoke with Nora Allergy about Puerto Vallarta. She has a severe peanut allergy and carries an EpiPen.")

    assert intake["consultation_thesis"]["deterministic_clinical_evaluation"]["hard_hold"] is True
    assert intake["clinical_screening_enabled"] is True
    assert "peanut allergy" in intake["clinical_profile"]["health_notes"]
    assert "No acute" not in intake["clinical_profile"]["health_notes"]


def test_voice_memo_without_a_disclosure_raises_no_hold(admin_client):
    intake = _stage(admin_client, "Spoke with Owen Clear about Puerto Vallarta. He wants quiet mornings and good sleep.")

    assert intake["consultation_thesis"]["deterministic_clinical_evaluation"]["hard_hold"] is False
