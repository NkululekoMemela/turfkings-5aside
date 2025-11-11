// src/pages/LiveMatchPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import { getTeamById } from "../core/teams.js";

const MATCH_SECONDS = 1 * 10; // 5 minutes : 5 * 60
const CAPTAIN_CODES = ["11", "22", "3333"];

// Single audio instance for full-time whistle / alarm.
// Put alarm.mp3 inside public/ so it is served as /alarm.mp3
const matchEndSound =
  typeof Audio !== "undefined" ? new Audio("/alarm.mp4") : null;

export function LiveMatchPage({
  teams,
  currentMatchNo,
  currentMatch,
  currentEvents,
  onAddEvent,
  onDeleteEvent,
  onUndoLastEvent,
  onConfirmEndMatch,
  onBackToLanding,
  onGoToStats,
}) {
  const { teamAId, teamBId, standbyId } = currentMatch;
  const teamA = getTeamById(teams, teamAId);
  const teamB = getTeamById(teams, teamBId);
  const standbyTeam = getTeamById(teams, standbyId);

  const [secondsLeft, setSecondsLeft] = useState(MATCH_SECONDS);
  const [running, setRunning] = useState(true);
  const [timeUp, setTimeUp] = useState(false);

  const [eventType, setEventType] = useState("goal"); // "goal" | "shibobo"
  const [scoringTeamId, setScoringTeamId] = useState(teamAId);
  const [scorerName, setScorerName] = useState("");
  const [assistName, setAssistName] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(15);

  // delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Timer
  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimeUp(true);
          setRunning(false);

          // 🔔 Play alarm / whistle when time is up
          if (matchEndSound) {
            try {
              matchEndSound.currentTime = 0;
              matchEndSound.play().catch(() => {
                // Ignore autoplay errors (e.g. if user hasn't interacted yet)
              });
            } catch (e) {
              // swallow any unexpected audio errors
            }
          }

          // Existing alert as backup visual cue
          if (typeof window !== "undefined") {
            try {
              window.alert("Time is up! Please end the match.");
            } catch (e) {}
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [running, secondsLeft]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, "0");
    const s = (secondsLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [secondsLeft]);

  const goalsA = currentEvents.filter(
    (e) => e.teamId === teamAId && e.type === "goal"
  ).length;
  const goalsB = currentEvents.filter(
    (e) => e.teamId === teamBId && e.type === "goal"
  ).length;

  const playersForSelectedTeam =
    scoringTeamId === teamAId ? teamA.players : teamB.players;

  const assistOptions = playersForSelectedTeam.filter(
    (p) => p !== scorerName
  );

  const handleAddEvent = () => {
    if (!scorerName) return;

    const event = {
      id: Date.now().toString(),
      type: eventType, // "goal" or "shibobo"
      teamId: scoringTeamId,
      scorer: scorerName,
      assist: eventType === "goal" && assistName ? assistName : null,
      timeSeconds: MATCH_SECONDS - secondsLeft,
    };

    onAddEvent(event);
    setAssistName("");
  };

  const handleEndMatchClick = () => {
    setShowConfirmModal(true);
    setConfirmCountdown(15);
  };

  // confirmation countdown for end-of-match
  useEffect(() => {
    if (!showConfirmModal) return;
    if (confirmCountdown <= 0) {
      handleConfirmFinal();
      return;
    }
    const id = setInterval(() => {
      setConfirmCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showConfirmModal, confirmCountdown]);

  const handleGoBackToEdit = () => {
    setShowConfirmModal(false);
    setConfirmCountdown(15);
  };

  const handleConfirmFinal = () => {
    setShowConfirmModal(false);
    setConfirmCountdown(15);
    const summary = {
      teamAId,
      teamBId,
      standbyId,
      goalsA,
      goalsB,
    };
    onConfirmEndMatch(summary);
  };

  // Delete with captain code
  const handleRequestDelete = (index) => {
    setDeleteIndex(index);
    setDeleteCode("");
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteIndex(null);
    setDeleteCode("");
    setDeleteError("");
  };

  const handleConfirmDelete = () => {
    const code = deleteCode.trim();
    if (!CAPTAIN_CODES.includes(code)) {
      setDeleteError("Invalid captain code.");
      return;
    }
    if (deleteIndex !== null) {
      onDeleteEvent(deleteIndex);
    }
    handleCancelDelete();
  };

  return (
    <div className="page live-page">
      <header className="header">
        <h1>Match #{currentMatchNo}</h1>
        <p>
          On-field: <strong>{teamA.label}</strong> (c: {teamA.captain}) vs{" "}
          <strong>{teamB.label}</strong> (c: {teamB.captain})
        </p>
        <p>
          Standby:{" "}
          <strong>{standbyTeam.label}</strong> (c: {standbyTeam.captain})
        </p>
      </header>

      <section className="card">
        <div className="timer-row">
          <div className="timer-display">{formattedTime}</div>
          {timeUp && (
            <span className="timer-warning">Time is up – end match!</span>
          )}
        </div>

        <div className="score-row">
          <div className="score-team">
            <strong>{teamA.label}</strong>
            <div className="score-number">{goalsA}</div>
          </div>
          <div className="score-dash">–</div>
          <div className="score-team">
            <strong>{teamB.label}</strong>
            <div className="score-number">{goalsB}</div>
          </div>
        </div>

        <div className="event-input">
          <h3>Log Event</h3>

          <div className="field-row">
            <label>Event type</label>
            <div className="team-toggle">
              <button
                className={
                  eventType === "goal" ? "toggle-btn active" : "toggle-btn"
                }
                onClick={() => setEventType("goal")}
              >
                Goal
              </button>
              <button
                className={
                  eventType === "shibobo" ? "toggle-btn active" : "toggle-btn"
                }
                onClick={() => {
                  setEventType("shibobo");
                  setAssistName("");
                }}
              >
                Shibobo
              </button>
            </div>
          </div>

          <div className="team-toggle">
            <button
              className={
                scoringTeamId === teamAId ? "toggle-btn active" : "toggle-btn"
              }
              onClick={() => {
                setScoringTeamId(teamAId);
                setScorerName("");
                setAssistName("");
              }}
            >
              {teamA.label}
            </button>
            <button
              className={
                scoringTeamId === teamBId ? "toggle-btn active" : "toggle-btn"
              }
              onClick={() => {
                setScoringTeamId(teamBId);
                setScorerName("");
                setAssistName("");
              }}
            >
              {teamB.label}
            </button>
          </div>

          <div className="field-row">
            <label>Scorer</label>
            <select
              value={scorerName}
              onChange={(e) => {
                setScorerName(e.target.value);
                if (e.target.value === assistName) {
                  setAssistName("");
                }
              }}
            >
              <option value="">Select scorer</option>
              {playersForSelectedTeam.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <label>Assist (optional)</label>
            <select
              value={assistName}
              onChange={(e) => setAssistName(e.target.value)}
              disabled={eventType === "shibobo"}
            >
              <option value="">
                {eventType === "shibobo"
                  ? "Assist not used for shibobo"
                  : "No assist"}
              </option>
              {eventType === "goal" &&
                assistOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
            </select>
          </div>

          <button className="primary-btn" onClick={handleAddEvent}>
            Add Event
          </button>
        </div>

        <div className="event-log">
          <div className="event-log-header">
            <h3>Current Match Events</h3>
            <button className="secondary-btn" onClick={onUndoLastEvent}>
              Undo last
            </button>
          </div>
          {currentEvents.length === 0 && (
            <p className="muted">No events yet.</p>
          )}
          <ul>
            {currentEvents.map((e, idx) => {
              const team =
                e.teamId === teamAId ? teamA : e.teamId === teamBId ? teamB : null;
              const typeLabel = e.type === "shibobo" ? "Shibobo" : "Goal";
              return (
                <li key={e.id} className="event-item">
                  <span>
                    [{formatSeconds(e.timeSeconds)}] {team?.label} –{" "}
                    <strong>{typeLabel}:</strong> {e.scorer}
                    {e.assist ? ` (assist: ${e.assist})` : ""}
                  </span>
                  <div className="event-actions">
                    <button
                      className="link-btn"
                      onClick={() => handleRequestDelete(idx)}
                    >
                      delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="actions-row">
          <button className="secondary-btn" onClick={onBackToLanding}>
            Back
          </button>
          <button className="secondary-btn" onClick={onGoToStats}>
            View Stats
          </button>
          <button className="primary-btn" onClick={handleEndMatchClick}>
            End Match
          </button>
        </div>
      </section>

      {/* End match confirm modal */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm End of Match</h3>
            <p>
              <strong>{teamA.label}</strong> {goalsA} – {goalsB}{" "}
              <strong>{teamB.label}</strong>
            </p>
            <p>
              Are you sure everything is correct? You have{" "}
              <strong>{confirmCountdown}</strong> seconds to go back and edit.
            </p>
            <div className="actions-row">
              <button className="secondary-btn" onClick={handleGoBackToEdit}>
                Go back &amp; edit
              </button>
              <button className="primary-btn" onClick={handleConfirmFinal}>
                Confirm &amp; lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete event confirm modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm Delete Event</h3>
            <p>To delete an event, enter any team captain's code.</p>
            <div className="field-row">
              <label>Captain code</label>
              <input
                type="password"
                className="text-input"
                value={deleteCode}
                onChange={(e) => {
                  setDeleteCode(e.target.value);
                  setDeleteError("");
                }}
                maxLength={2}
              />
              {deleteError && <p className="error-text">{deleteError}</p>}
            </div>
            <div className="actions-row">
              <button className="secondary-btn" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className="primary-btn" onClick={handleConfirmDelete}>
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSeconds(s) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
