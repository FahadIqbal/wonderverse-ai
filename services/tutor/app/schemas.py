"""Request schema. Mirrors src/domain/learning/tutor/schemas.ts (TutorContext). Unknown keys are rejected."""
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Short = Annotated[str, StringConstraints(max_length=40)]
Finite = Annotated[float, Field(allow_inf_nan=False)]

STATUSES = Literal["VALID", "NO_BATTERY", "OPEN_CIRCUIT", "SHORT_CIRCUIT", "NO_PATH", "UNSUPPORTED_TOPOLOGY"]
REASON_CODES = Literal[
    "OK", "NO_SOURCE", "BATTERY_SHORT", "DISCONNECTED", "NO_ENERGIZED_PATH", "MULTIPLE_PATHS", "SWITCH_OFF", "UNKNOWN"
]
MAX_QUESTION = 200
MAX_RESPONSE = 600


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Solver(Strict):
    status: STATUSES
    reasonCode: REASON_CODES
    reason: Annotated[str, StringConstraints(max_length=100)]
    batteryVoltage: Finite
    totalCurrent: Finite


class Counts(Strict):
    battery: int = Field(ge=0, le=999)
    lamp: int = Field(ge=0, le=999)
    switch: int = Field(ge=0, le=999)
    resistor: int = Field(ge=0, le=999)
    wire: int = Field(ge=0, le=999)


class Lamp(Strict):
    id: Short
    label: Short
    energized: bool
    current: Finite
    voltage: Finite


class Switch(Strict):
    id: Short
    label: Short
    closed: bool


class Objective(Strict):
    id: Short
    title: Annotated[str, StringConstraints(max_length=80)]
    category: Literal["circuit", "learning"]
    met: bool


class TutorContext(Strict):
    missionId: Short
    missionTitle: Annotated[str, StringConstraints(max_length=60)]
    phase: Literal["briefing", "building", "quiz", "complete"]
    hintLevel: int = Field(ge=0, le=3)
    solver: Solver
    counts: Counts
    lamps: list[Lamp] = Field(max_length=8)
    switches: list[Switch] = Field(max_length=8)
    objectives: list[Objective] = Field(max_length=8)
    authoredHint: Optional[Annotated[str, StringConstraints(max_length=400)]] = None
    recentEvents: list[Annotated[str, StringConstraints(max_length=60)]] = Field(max_length=8)


class HintRequest(Strict):
    context: TutorContext
    question: Optional[Annotated[str, StringConstraints(max_length=MAX_QUESTION)]] = None


class HintResponse(Strict):
    text: Annotated[str, StringConstraints(min_length=1, max_length=MAX_RESPONSE)]
