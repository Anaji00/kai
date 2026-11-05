"""
KAI Sanctuary Clinical Governance, Security & Optimistic Concurrency Control Engine.
Deterministic clinical evaluation, prompt-injection spotlighting, and cryptographic OCC.
MANDATORY INVARIANT: Deterministic clinical rules must run synchronously before any probabilistic LLM synthesis.
"""

import hashlib
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field

logger = logging.getLogger("kai_clinical_governance")


# =============================================================================
# 1. Untrusted Input Sanitizer & Cryptographic Spotlighting
# =============================================================================

# Invisible Unicode control characters and directional overrides
_INVISIBLE_CONTROL_REGEX = re.compile(
    r"[\u200B-\u200D\u200E\u200F\uFEFF\u202A-\u202E\u2060-\u206F\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]"
)

# Common prompt-injection heuristics and jailbreak patterns
_PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|prompts)", re.IGNORECASE),
    re.compile(r"(system\s+override|admin\s+override|developer\s+mode|root\s+access)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(unrestricted|dan|jailbroken|an\s+ai\s+without\s+rules)", re.IGNORECASE),
    re.compile(r"forget\s+(your\s+)?(safety|rules|instructions|identity)", re.IGNORECASE),
    re.compile(r"<\|im_start\|>|<\|im_end\|>|\[INST\]|\[/INST\]", re.IGNORECASE),
    re.compile(r"bypass\s+(clinical|safety|medical|authorization)\s+(hold|rules|checks)", re.IGNORECASE),
    re.compile(r"act\s+as\s+(a\s+system\s+administrator|root|kernel)", re.IGNORECASE),
]


class UntrustedInputSanitizer:
    """
    Sanitizes raw external strings from emails, WhatsApp messages, and uploaded documents.
    Strips invisible control characters, flags prompt injection attempts, and wraps
    untrusted payloads in cryptographic spotlight boundaries.
    """

    @classmethod
    def sanitize_text(cls, raw_text: str) -> str:
        """Strips invisible control codes and null bytes."""
        if not raw_text:
            return ""
        # Strip invisible Unicode control characters
        cleaned = _INVISIBLE_CONTROL_REGEX.sub("", raw_text)
        # Normalize excessive carriage returns and tabs
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        return cleaned.strip()

    @classmethod
    def detect_prompt_injection(cls, text: str) -> Tuple[bool, List[str]]:
        """Scans for imperative prompt injection patterns and return detected markers."""
        if not text:
            return False, []
        detected = []
        for pattern in _PROMPT_INJECTION_PATTERNS:
            if pattern.search(text):
                detected.append(pattern.pattern)
        return len(detected) > 0, detected

    @classmethod
    def spotlight_external_data(cls, raw_text: str, source_label: str = "EXTERNAL_UNTRUSTED") -> str:
        """
        Wraps external user input inside cryptographic boundary delimiters.
        Ensures downstream LLM prompts treat this payload strictly as inert data, never instructions.
        """
        boundary_id = uuid.uuid4().hex[:12].upper()
        clean = cls.sanitize_text(raw_text)
        has_injection, markers = cls.detect_prompt_injection(clean)
        
        warning_header = ""
        if has_injection:
            logger.warning(f"Prompt injection pattern detected in {source_label}: {markers}")
            warning_header = f"[SECURITY NOTICE: Potential prompt injection markers neutralized ({len(markers)} flags)]\n"

        return (
            f"<UNTRUSTED_{source_label}_{boundary_id}>\n"
            f"{warning_header}"
            f"{clean}\n"
            f"</UNTRUSTED_{source_label}_{boundary_id}>"
        )


# =============================================================================
# 2. Channel Capability Matrix (Least-Privilege Action Staging)
# =============================================================================

class IngestionChannel(str, Enum):
    INBOUND_EMAIL = "INBOUND_EMAIL"
    INBOUND_WHATSAPP = "INBOUND_WHATSAPP"
    INBOUND_WEBHOOK = "INBOUND_WEBHOOK"
    DOCUMENT_PARSER = "DOCUMENT_PARSER"
    OPERATOR_PORTAL = "OPERATOR_PORTAL"


# Permitted action types that each ingestion channel is allowed to stage
CHANNEL_CAPABILITY_MATRIX: Dict[IngestionChannel, Set[str]] = {
    IngestionChannel.INBOUND_EMAIL: {
        "guest_intake",
        "voucher_confirmation",
        "flight_coordination",
        "flight_delay_chauffeur_update",
        "email_reply",
        "outreach",
        "corporate_retreat_proposal"
    },
    IngestionChannel.INBOUND_WHATSAPP: {
        "whatsapp_concierge",
        "concierge_guest_ping",
        "guest_companion_invitation",
        "sms_alert"
    },
    IngestionChannel.INBOUND_WEBHOOK: {
        "flight_delay_chauffeur_update",
        "flight_coordination",
        "manifest_discrepancy"
    },
    IngestionChannel.DOCUMENT_PARSER: {
        "clinical_document_review",
        "guest_intake"
    },
    IngestionChannel.OPERATOR_PORTAL: {
        "*"  # Operator has full HITL staging capability
    }
}


def assert_channel_capability(channel: IngestionChannel, action_type: str) -> None:
    """Enforces least-privilege action staging per channel."""
    allowed = CHANNEL_CAPABILITY_MATRIX.get(channel, set())
    if "*" in allowed:
        return
    if action_type not in allowed:
        raise PermissionError(
            f"Security Violation: Ingestion channel '{channel.value}' is not authorized to stage action '{action_type}'."
        )


# =============================================================================
# 3. Deterministic Clinical Safety Engine (Ground-Truth Rule Evaluation)
# =============================================================================

class ClinicalSeverity(str, Enum):
    CLEAR = "CLEAR"
    ADVISORY = "ADVISORY"
    MODERATE_CAUTION = "MODERATE_CAUTION"
    HARD_CONTRAINDICATION_HOLD = "HARD_CONTRAINDICATION_HOLD"


class ClinicalFinding(BaseModel):
    finding_id: str
    category: str  # MEDICATION, CARDIOVASCULAR, NEUROLOGICAL, ALLERGEN, PREGNANCY, MUSCULOSKELETAL
    severity: ClinicalSeverity
    trigger: str
    rule: str
    rationale: str
    blocked_modalities: List[str] = Field(default_factory=list)
    safe_alternative: str


class ClinicalEvaluationReport(BaseModel):
    client_name: str
    sanctuary_slug: str
    overall_severity: ClinicalSeverity
    hard_hold: bool
    blocked_modalities: List[str]
    findings: List[ClinicalFinding]
    deterministic_hash: str
    evaluated_at: str
    nurse_review_required: bool


_NEGATION_BEFORE_TERM = re.compile(r"\b(no|not|never|denies|denied|without|negative for|free of)\b[^.;\n]{0,30}$")
_UNCERTAINTY_BEFORE_TERM = re.compile(r"\b(not sure|not certain|unsure)\b[^.;\n]{0,30}$")
_ALLERGY_CONTEXT = re.compile(r"\b(allerg\w*|anaphyla\w*|epi-?pen|auto-?injector)\b")


def _mentions(term: str, text: str) -> bool:
    """
    Whole-word, negation-aware term match, so "been" is not the allergen "bee" and "no pregnancy" is not a
    pregnancy disclosure. Uncertain wording ("not sure if pregnant") still counts, because a false clear is
    the unsafe direction.
    """
    pattern = rf"(?<![a-z0-9]){re.escape(term)}(?:s|'s)?(?![a-z0-9])"
    for match in re.finditer(pattern, text):
        prefix = text[max(0, match.start() - 45):match.start()]
        if _UNCERTAINTY_BEFORE_TERM.search(prefix) or not _NEGATION_BEFORE_TERM.search(prefix):
            return True
    return False


def _mentions_any(terms, text: str) -> bool:
    return any(_mentions(term, text) for term in terms)


def _disclosed_allergens(allergens, allergy_field: str, text: str) -> List[str]:
    """
    Food and insect words only count as allergens in an allergy field or a sentence about allergies;
    "I love shrimp" or "bee pollen tea" is not an anaphylaxis disclosure.
    """
    allergy_sentences = " . ".join(
        sentence for sentence in re.split(r"[.!?;\n]+", text) if _ALLERGY_CONTEXT.search(sentence)
    )
    searchable = f"{allergy_field.lower()} . {allergy_sentences}"
    return sorted(a for a in allergens if _mentions(a, searchable))


class DeterministicClinicalEngine:
    """
    Deterministic clinical gatekeeper. Runs before any LLM generation.
    Evaluates guest medications, vital metrics, conditions, and allergens.
    """

    # High-risk medication classes
    SSRI_SNRI_MEDS = {
        "sertraline", "zoloft", "fluoxetine", "prozac", "escitalopram", "lexapro",
        "citalopram", "celexa", "paroxetine", "paxil", "venlafaxine", "effexor",
        "duloxetine", "cymbalta", "desvenlafaxine", "pristiq", "vortioxetine",
        "trintellix", "vilazodone", "viibryd", "bupropion", "wellbutrin",
        "lithium", "phenelzine", "nardil", "tranylcypromine", "parnate", "selegiline",
        "ssri", "snri", "maoi"
    }

    ANTICOAGULANT_MEDS = {
        "warfarin", "coumadin", "jantoven", "apixaban", "eliquis", "rivaroxaban",
        "xarelto", "edoxaban", "savaysa", "dabigatran", "pradaxa", "heparin",
        "enoxaparin", "lovenox", "clopidogrel", "plavix", "ticagrelor", "brilinta"
    }

    ANAPHYLACTIC_ALLERGENS = {
        "peanut", "peanuts", "tree nut", "tree nuts", "almond", "walnut", "cashew",
        "shellfish", "shrimp", "lobster", "crab", "bee", "wasp", "latex", "penicillin"
    }

    # Conditions carried over from the copilot's original contraindication rules.
    ADDITIONAL_CONDITION_RULES = [
        {
            "finding": "BREATHWORK-CONDITION",
            "category": "NEUROLOGICAL",
            "terms": ["aneurysm", "detached retina", "bipolar i", "arrhythmia", "atrial fibrillation", "tachycardia", "svt"],
            "severity": ClinicalSeverity.HARD_CONTRAINDICATION_HOLD,
            "blocked": ["Intense Rapid Breathwork / Tummo / Holotropic"],
            "rule": "High-velocity hyperventilation alters cerebral blood flow and arterial CO2 and is contraindicated with these conditions.",
            "rationale": "Hypocapnia can precipitate neurological or cardiovascular events in susceptible guests.",
            "safe_alternative": "Slow nasal 4-7-8 breathing at a comfortable pace under nurse guidance.",
        },
        {
            "finding": "COLD-CONDITION",
            "category": "CARDIOVASCULAR",
            "terms": ["raynaud", "peripheral neuropathy", "arrhythmia", "tachycardia", "svt", "cardiac", "cold urticaria"],
            "severity": ClinicalSeverity.HARD_CONTRAINDICATION_HOLD,
            "blocked": ["Cold Plunge / Cryo Therapy"],
            "rule": "Cold shock and peripheral vasospasm are contraindicated with these conditions.",
            "rationale": "Sudden cold exposure drives sympathetic surges and peripheral vasoconstriction.",
            "safe_alternative": "Temperate mineral soaking (34-36C) with gradual temperature changes.",
        },
        {
            "finding": "ACOUSTIC-DEVICE",
            "category": "NEUROLOGICAL",
            "terms": ["pacemaker", "icd", "cochlear implant", "recent concussion", "concussion", "tinnitus"],
            "severity": ClinicalSeverity.MODERATE_CAUTION,
            "blocked": ["Direct Heavy Acoustic Gong / High-Vibration Sound Bed"],
            "rule": "High mechanical acoustic resonance near the skull or implanted leads needs nurse review.",
            "rationale": "Strong vibration may cause discomfort or device interference.",
            "safe_alternative": "Soft singing-bowl sound at a distance, with volume set by the nurse.",
        },
    ]

    @classmethod
    def evaluate(
        cls,
        client_name: str,
        sanctuary_slug: str,
        clinical_profile: Dict[str, Any],
        wellness_profile: Optional[Dict[str, Any]] = None
    ) -> ClinicalEvaluationReport:
        """
        Executes deterministic clinical protocol analysis against guest disclosures.
        """
        findings: List[ClinicalFinding] = []
        blocked_modalities: Set[str] = set()

        # Combine text fields for thorough keyword analysis
        text_corpus = " ".join([
            str(clinical_profile.get("health_notes", "")),
            str(clinical_profile.get("medical_history", "")),
            str(clinical_profile.get("medications", "")),
            str(clinical_profile.get("injuries", "")),
            str(clinical_profile.get("allergies", "")),
            str(clinical_profile.get("movement_experience", "")),
            str((wellness_profile or {}).get("somatic_goals", "")),
            str((wellness_profile or {}).get("dietary_preferences", "")),
        ]).lower()

        # Extract structured medications and allergies if present
        medications_list: List[str] = clinical_profile.get("medication_list", [])
        if isinstance(medications_list, str):
            medications_list = [m.strip().lower() for m in medications_list.split(",")]
        else:
            medications_list = [str(m).lower() for m in medications_list]

        # ---------------------------------------------------------------------
        # 1. PSYCHOTROPIC MEDICATIONS & HYPERVENTILATION / BOTANICALS
        # ---------------------------------------------------------------------
        medications_corpus = " . ".join(medications_list)
        detected_ssris = sorted(m for m in cls.SSRI_SNRI_MEDS if _mentions(m, text_corpus) or _mentions(m, medications_corpus))
        if detected_ssris:
            med_str = ", ".join(detected_ssris)
            blocked_modalities.add("Holotropic Hyperventilation Breathwork")
            blocked_modalities.add("Endogenous Serotonergic Breathwork")
            blocked_modalities.add("Active Plant/Botanical Tonics")
            findings.append(ClinicalFinding(
                finding_id=f"MED-SEROTONIN-{len(findings)+1}",
                category="MEDICATION",
                severity=ClinicalSeverity.HARD_CONTRAINDICATION_HOLD,
                trigger=f"Prescription Psychotropic/Serotonergic Medication Detected: {med_str}",
                rule="Holotropic rapid hyperventilation is strictly contraindicated with active SSRI/SNRI/MAOI/Lithium therapy due to risk of autonomic dysregulation, hyperventilation tetany, and affective destabilization.",
                rationale="Altered respiratory alkalosis from rapid hyperventilation shifts calcium binding and autonomic catecholamine sensitivity, conflicting with central serotonergic regulation.",
                blocked_modalities=["Holotropic Hyperventilation Breathwork", "Endogenous Serotonergic Breathwork", "Active Plant/Botanical Tonics"],
                safe_alternative="Gentle 4-7-8 Parasympathetic Vagus Breathwork and 432Hz Acoustic Sound Resonance with zero hyperventilation."
            ))

        # ---------------------------------------------------------------------
        # 2. ANTICOAGULANT THERAPY & INTENSIVE BODYWORK
        # ---------------------------------------------------------------------
        detected_anticoag = sorted(m for m in cls.ANTICOAGULANT_MEDS if _mentions(m, text_corpus) or _mentions(m, medications_corpus))
        if detected_anticoag:
            med_str = ", ".join(detected_anticoag)
            blocked_modalities.add("Deep Tissue Myofascial Release")
            blocked_modalities.add("Suction Cupping Therapy")
            findings.append(ClinicalFinding(
                finding_id=f"MED-ANTICOAG-{len(findings)+1}",
                category="MEDICATION",
                severity=ClinicalSeverity.MODERATE_CAUTION,
                trigger=f"Prescription Anticoagulant / Antiplatelet Detected: {med_str}",
                rule="High-velocity deep tissue bodywork, aggressive psoas release, and suction cupping are contraindicated due to severe hematoma and internal bruising risk.",
                rationale="Inhibited coagulation cascade increases subcutaneous and intramuscular capillary rupture under mechanical shear force.",
                blocked_modalities=["Deep Tissue Myofascial Release", "Suction Cupping Therapy"],
                safe_alternative="Gentle Swedish effleurage, craniosacral unwinding, and restorative Yin yoga with props."
            ))

        # ---------------------------------------------------------------------
        # 3. CARDIOVASCULAR & STAGE 2 HYPERTENSION
        # ---------------------------------------------------------------------
        # Check blood pressure disclosures
        bp_match = re.search(r"(\d{2,3})\s*/\s*(\d{2,3})", text_corpus)
        is_stage_2_htn = False
        if bp_match:
            sys_val, dia_val = int(bp_match.group(1)), int(bp_match.group(2))
            if sys_val >= 160 or dia_val >= 100:
                is_stage_2_htn = True

        has_cardio = _mentions_any([
            "hypertension", "high blood pressure", "arrhythmia", "atrial fibrillation",
            "heart condition", "stent", "pacemaker", "angina", "myocardial", "cardiovascular"
        ], text_corpus)

        if is_stage_2_htn or (has_cardio and _mentions_any(["severe", "uncontrolled", "stage 2", "stage ii"], text_corpus)):
            blocked_modalities.add("Cold Plunge / Ice Immersion (<12°C)")
            blocked_modalities.add("High-Heat Finnish Sauna (>85°C)")
            findings.append(ClinicalFinding(
                finding_id=f"CARDIO-PRESSOR-{len(findings)+1}",
                category="CARDIOVASCULAR",
                severity=ClinicalSeverity.HARD_CONTRAINDICATION_HOLD,
                trigger="Stage 2 Hypertension (>=160/100 mmHg) or Severe Cardiovascular Condition Detected",
                rule="Cold shock response and rapid hot-to-cold thermal cycling trigger immediate peripheral vasoconstriction, spiked mean arterial pressure, and cardiac workload.",
                rationale="Sudden cold water immersion elicits profound sympathoexcitation and catecholamine surge, risking acute hypertensive crisis or reflex arrhythmia.",
                blocked_modalities=["Cold Plunge / Ice Immersion (<12°C)", "High-Heat Finnish Sauna (>85°C)"],
                safe_alternative="Ambient mineral hydrotherapy (34–36°C) and gentle botanical foot baths."
            ))
        elif has_cardio:
            blocked_modalities.add("Extreme Hot-to-Cold Thermal Cycling")
            findings.append(ClinicalFinding(
                finding_id=f"CARDIO-ADVISORY-{len(findings)+1}",
                category="CARDIOVASCULAR",
                severity=ClinicalSeverity.ADVISORY,
                trigger="Cardiovascular Sensitivity or Mild Hypertension Disclosed",
                rule="Thermal immersion requires gradual acclimation and hydration monitoring.",
                rationale="Thermoregulatory dilation and contraction require autonomic buffering.",
                blocked_modalities=["Extreme Hot-to-Cold Thermal Cycling"],
                safe_alternative="Temperate saltwater soaking and shaded poolside relaxation."
            ))

        # ---------------------------------------------------------------------
        # 4. NEUROLOGICAL & EPILEPSY / SEIZURES
        # ---------------------------------------------------------------------
        if _mentions_any(["epilepsy", "seizure", "convulsion"], text_corpus):
            blocked_modalities.add("Holotropic Hyperventilation Breathwork")
            blocked_modalities.add("Stroboscopic / Rapid Pulsed Visual Sound Baths")
            findings.append(ClinicalFinding(
                finding_id=f"NEURO-SEIZURE-{len(findings)+1}",
                category="NEUROLOGICAL",
                severity=ClinicalSeverity.HARD_CONTRAINDICATION_HOLD,
                trigger="Epilepsy or History of Seizures Disclosed",
                rule="Forced hyperventilation causes hypocapnia and cerebral vasoconstriction, which lowers the seizure threshold.",
                rationale="Hypocapnic cerebral hypoxia is a recognized trigger for paroxysmal spike-and-wave discharges.",
                blocked_modalities=["Holotropic Hyperventilation Breathwork", "Stroboscopic / Rapid Pulsed Visual Sound Baths"],
                safe_alternative="Continuous rhythmic ocean breathing, pure harmonic 432Hz acoustic singing bowl immersion with steady natural lighting."
            ))

        # ---------------------------------------------------------------------
        # 5. PREGNANCY
        # ---------------------------------------------------------------------
        if _mentions_any(["pregnant", "pregnancy", "trimester", "expecting a baby", "expecting a child"], text_corpus):
            blocked_modalities.add("Thermal Hydrotherapy (>38°C / Hot Tubs / Saunas)")
            blocked_modalities.add("Prone Deep Myofascial Bodywork")
            blocked_modalities.add("Vigorous Core Agni-Sara Breathwork")
            findings.append(ClinicalFinding(
                finding_id=f"OBGYN-PREGNANCY-{len(findings)+1}",
                category="PREGNANCY",
                severity=ClinicalSeverity.HARD_CONTRAINDICATION_HOLD,
                trigger="Pregnancy Disclosed",
                rule="Maternal hyperthermia (>38.9°C) and prone abdominal pressure are contraindicated.",
                rationale="Elevated core maternal temperature poses fetal developmental risk; prone positioning causes inferior vena cava compression.",
                blocked_modalities=["Thermal Hydrotherapy (>38°C / Hot Tubs / Saunas)", "Prone Deep Myofascial Bodywork", "Vigorous Core Agni-Sara Breathwork"],
                safe_alternative="Side-lying prenatal restorative massage, gentle pelvic floor mobility, and cool ocean air breathwork."
            ))

        # ---------------------------------------------------------------------
        # 6. ANAPHYLACTIC ALLERGIES & DIETARY CRITICAL PATH
        # ---------------------------------------------------------------------
        detected_allergens = _disclosed_allergens(
            cls.ANAPHYLACTIC_ALLERGENS, str(clinical_profile.get("allergies", "") or ""), text_corpus
        )
        if detected_allergens:
            allergen_str = ", ".join(detected_allergens)
            findings.append(ClinicalFinding(
                finding_id=f"ALLERGY-ANAPHYLAXIS-{len(findings)+1}",
                category="ALLERGEN",
                severity=ClinicalSeverity.HARD_CONTRAINDICATION_HOLD,
                trigger=f"Potential Anaphylactic Allergen Disclosed: {allergen_str}",
                rule="Requires executive chef briefing, isolated prep protocol, and verification of guest auto-injector (EpiPen) before arrival.",
                rationale="Cross-contamination in international kitchen environments poses severe airway and anaphylactic risk.",
                blocked_modalities=["Communal Buffets with Allergen Exposure"],
                safe_alternative="Individually plated, chef-supervised hypoallergenic dining plan with designated preparation surfaces."
            ))

        # ---------------------------------------------------------------------
        # 7. ADDITIONAL CONDITION RULES
        # ---------------------------------------------------------------------
        for rule in cls.ADDITIONAL_CONDITION_RULES:
            matched_terms = [t for t in rule["terms"] if _mentions(t, text_corpus)]
            if matched_terms:
                blocked_modalities.update(rule["blocked"])
                findings.append(ClinicalFinding(
                    finding_id=f"{rule['finding']}-{len(findings)+1}",
                    category=rule["category"],
                    severity=rule["severity"],
                    trigger=f"Condition Disclosed: {', '.join(matched_terms)}",
                    rule=rule["rule"],
                    rationale=rule["rationale"],
                    blocked_modalities=rule["blocked"],
                    safe_alternative=rule["safe_alternative"],
                ))

        # Determine overall severity
        has_hard_hold = any(f.severity == ClinicalSeverity.HARD_CONTRAINDICATION_HOLD for f in findings)
        has_moderate = any(f.severity == ClinicalSeverity.MODERATE_CAUTION for f in findings)
        has_advisory = any(f.severity == ClinicalSeverity.ADVISORY for f in findings)

        if has_hard_hold:
            overall_severity = ClinicalSeverity.HARD_CONTRAINDICATION_HOLD
        elif has_moderate:
            overall_severity = ClinicalSeverity.MODERATE_CAUTION
        elif has_advisory:
            overall_severity = ClinicalSeverity.ADVISORY
        else:
            overall_severity = ClinicalSeverity.CLEAR

        # Compute deterministic SHA-256 hash
        canonical_findings_str = json.dumps([
            {"id": f.finding_id, "rule": f.rule, "severity": f.severity.value, "blocked": f.blocked_modalities}
            for f in findings
        ], sort_keys=True)
        det_hash = hashlib.sha256(canonical_findings_str.encode("utf-8")).hexdigest()

        return ClinicalEvaluationReport(
            client_name=client_name,
            sanctuary_slug=sanctuary_slug,
            overall_severity=overall_severity,
            hard_hold=has_hard_hold,
            blocked_modalities=sorted(list(blocked_modalities)),
            findings=findings,
            deterministic_hash=det_hash,
            evaluated_at=datetime.now(timezone.utc).isoformat(),
            nurse_review_required=len(findings) > 0
        )


def attach_clinical_evaluation(
    thesis: Optional[Dict[str, Any]],
    client_name: str,
    sanctuary_slug: str,
    clinical_profile: Optional[Dict[str, Any]],
    wellness_profile: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], ClinicalEvaluationReport]:
    """Runs the engine and stores its report on the intake thesis. Every intake path must call this."""
    report = DeterministicClinicalEngine.evaluate(
        client_name=client_name,
        sanctuary_slug=sanctuary_slug,
        clinical_profile=clinical_profile or {},
        wellness_profile=wellness_profile or {},
    )
    updated = dict(thesis or {})
    updated["deterministic_clinical_evaluation"] = json.loads(report.model_dump_json())
    if report.hard_hold:
        flags = list(updated.get("clinical_flags") or [])
        hold_msg = f"HARD CONTRAINDICATION HOLD: Blocked modalities: {', '.join(report.blocked_modalities)}"
        if hold_msg not in flags:
            flags.insert(0, hold_msg)
        updated["clinical_flags"] = flags
    return updated, report


def active_clinical_hold(consultation_thesis: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Returns the evaluation when a hard hold is in force and no nurse clearance has been recorded."""
    evaluation = (consultation_thesis or {}).get("deterministic_clinical_evaluation")
    if not evaluation or not evaluation.get("hard_hold") or (consultation_thesis or {}).get("clinical_hold_override"):
        return None
    return evaluation


def clinical_hold_conflict(evaluation: Dict[str, Any]) -> Dict[str, Any]:
    """HTTP 409 detail describing a hold that blocks a CRM commit."""
    return {
        "error_code": "CLINICAL_HOLD_ACTIVE",
        "message": "This guest has an active clinical hold. A nurse clearance must be recorded before committing to the CRM.",
        "blocked_modalities": evaluation.get("blocked_modalities", []),
        "findings": [f.get("trigger") for f in evaluation.get("findings", [])],
    }


# =============================================================================
# 4. Cryptographic Optimistic Concurrency Control (OCC) Draft Guard
# =============================================================================

class StateDriftConflict(Exception):
    """Raised when an approved draft's base state differs from the live record state."""
    def __init__(self, message: str, diff_payload: Dict[str, Any]):
        super().__init__(message)
        self.diff_payload = diff_payload


class HITLDraftConcurrencyGuard:
    """
    Computes and verifies cryptographic state hashes for HITL staged mutations.
    Prevents race conditions where live CRM records drift between draft creation
    and operator approval.
    """

    @classmethod
    def compute_entity_hash(cls, entity_data: Dict[str, Any]) -> str:
        """
        Computes canonical SHA-256 hash of an entity dictionary.
        Excludes volatile metadata like timestamps or access counts.
        """
        volatile_keys = {"created_at", "updated_at", "accessed_at", "synced_at", "last_active"}
        stable_dict = {
            k: v for k, v in sorted(entity_data.items())
            if k not in volatile_keys and not k.startswith("_")
        }
        # Serialize to deterministic JSON
        serialized = json.dumps(stable_dict, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @classmethod
    def verify_and_detect_drift(
        cls,
        staged_hash: Optional[str],
        live_entity_data: Dict[str, Any],
        staged_base_data: Optional[Dict[str, Any]] = None,
        proposed_patch_data: Optional[Dict[str, Any]] = None,
        force_override: bool = False
    ) -> Dict[str, Any]:
        """
        Verifies whether the live entity state has drifted since the draft was staged.
        If drifted and force_override is False, raises StateDriftConflict with 3-way diff.
        """
        live_hash = cls.compute_entity_hash(live_entity_data)

        # If no hash was staged, record live hash and allow
        if not staged_hash:
            return {"status": "NO_PREVIOUS_HASH", "live_hash": live_hash, "drift_detected": False}

        if live_hash == staged_hash:
            return {"status": "MATCH", "live_hash": live_hash, "drift_detected": False}

        # Drift detected! Compute 3-way diff
        conflicting_fields = []
        staged_base = staged_base_data or {}
        proposed_patch = proposed_patch_data or {}

        all_keys = set(staged_base.keys()) | set(live_entity_data.keys()) | set(proposed_patch.keys())
        diff_table = {}

        for k in all_keys:
            base_val = staged_base.get(k)
            live_val = live_entity_data.get(k)
            patch_val = proposed_patch.get(k)

            # If live differs from base, field has drifted
            if str(base_val) != str(live_val):
                diff_table[k] = {
                    "staged_base": base_val,
                    "live_record": live_val,
                    "proposed_patch": patch_val,
                    "is_conflict": (patch_val is not None and str(patch_val) != str(live_val))
                }
                if diff_table[k]["is_conflict"]:
                    conflicting_fields.append(k)

        diff_payload = {
            "error_code": "OCC_STATE_DRIFT_CONFLICT",
            "message": f"Entity state has drifted since draft creation ({len(conflicting_fields)} conflicting fields).",
            "staged_hash": staged_hash,
            "live_hash": live_hash,
            "conflicting_fields": conflicting_fields,
            "field_diffs": diff_table,
            "force_override_permitted": True
        }

        if not force_override:
            logger.warning(f"OCC State Drift detected for entity! Conflicts: {conflicting_fields}")
            raise StateDriftConflict(
                message=f"State drift detected on {len(conflicting_fields)} fields.",
                diff_payload=diff_payload
            )

        logger.info(f"Operator force-override applied for drifted entity ({len(conflicting_fields)} conflicts merged).")
        return {
            "status": "FORCE_OVERRIDDEN",
            "live_hash": live_hash,
            "drift_detected": True,
            "diff_payload": diff_payload
        }
