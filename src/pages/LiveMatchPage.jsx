// src/pages/LiveMatchPage.jsx

import React, { useEffect, useMemo, useState, useRef } from "react";
import { getTeamById } from "../core/teams.js";

const MATCH_SECONDS = 1 * 10; // 5 minutes : 5 * 60
const CAPTAIN_CODES = ["11", "22", "3333"];

// ✅ Correct URL for GitHub Pages subpath (and dev)
const SOUND_URL = `${import.meta.env.BASE_URL}alarm.mp4`;

// ✅ Create one Audio instance and configure it
const matchEndSound = typeof Audio !== "undefined" ? new Audio(SOUND_URL) : null;
if (matchEndSound) {
  matchEndSound.preload = "auto";
  matchEndSound.loop = false;
  matchEndSound.volume = 1;
}

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

  // delete confirmation (for events)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // 🔁 keep interval id to repeat whistle until match is ended
  const alarmLoopRef = useRef(null);

  // ❗ Back-protection modal
  const [showBackModal, setShowBackModal] = useState(false);
  const [backCode, setBackCode] = useState("");
  const [backError, setBackError] = useState("");

  // ✅ NEW: Undo-last confirmation (with captain code)
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [undoCode, setUndoCode] = useState("");
  const [undoError, setUndoError] = useState("");

  // ✅ Mobile autoplay fix: unlock audio on first user interaction
  useEffect(() => {
    if (!matchEndSound) return;
    const unlock = async () => {
      try {
        await matchEndSound.play();
        matchEndSound.pause();
        matchEndSound.currentTime = 0;
      } catch (_) {
        /* ignore */
      } finally {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("touchstart", unlock);
        window.removeEventListener("click", unlock);
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("click", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);

  // Main timer
  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimeUp(true);
          setRunning(false);

          // 🔔 Play alarm once when time is up
          (async () => {
            try {
              if (matchEndSound) {
                matchEndSound.currentTime = 0;
                await matchEndSound.play();
              }
              if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            } catch (_) {}
          })();

          // Visual backup
          try {
            window.alert("Time is up! Please end the match.");
          } catch (_) {}

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [running, secondsLeft]);

  // 🔁 After timeUp, repeat whistle + vibration every 10s until match is ended
  useEffect(() => {
    if (!timeUp) {
      if (alarmLoopRef.current) {
        clearInterval(alarmLoopRef.current);
        alarmLoopRef.current = null;
      }
      return;
    }

    alarmLoopRef.current = setInterval(async () => {
      try {
        if (matchEndSound) {
          matchEndSound.currentTime = 0;
          await matchEndSound.play();
        }
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      } catch (_) {}
    }, 10000);

    return () => {
      if (alarmLoopRef.current) {
        clearInterval(alarmLoopRef.current);
        alarmLoopRef.current = null;
      }
    };
  }, [timeUp]);

  const formattedTime = useMemo(() => {
    const m = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
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

  const assistOptions = playersForSelectedTeam.filter((p) => p !== scorerName);

  const handleAddEvent = () => {
    if (!scorerName) return;

    const event = {
      id: Date.now().toString(),
      type: eventType, // "goal" or "shibobo"
      teamId: scoringTeamId,
      // For shibobo we still use `scorer` field to hold the player name
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
    // 🛑 stop repeating alarm if running
    if (alarmLoopRef.current) {
      clearInterval(alarmLoopRef.current);
      alarmLoopRef.current = null;
    }

    setShowConfirmModal(false);
    setConfirmCountdown(15);
    const summary = { teamAId, teamBId, standbyId, goalsA, goalsB };
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

  // =========================
  //   Safe Back behaviour
  // =========================
  const hasProgress = currentEvents.length > 0 || secondsLeft < MATCH_SECONDS;

  const handleBackClick = () => {
    if (!hasProgress) {
      onBackToLanding(); // safe: no progress
      return;
    }
    // Protect with modal + captain code
    setBackCode("");
    setBackError("");
    setShowBackModal(true);
  };

  const handleCancelBack = () => {
    setShowBackModal(false);
    setBackCode("");
    setBackError("");
  };

  const handleConfirmDiscardAndBack = () => {
    const code = backCode.trim();
    if (!CAPTAIN_CODES.includes(code)) {
      setBackError("Invalid captain code.");
      return;
    }

    // stop alarm loop if any
    if (alarmLoopRef.current) {
      clearInterval(alarmLoopRef.current);
      alarmLoopRef.current = null;
    }

    setShowBackModal(false);
    setBackCode("");
    setBackError("");
    onBackToLanding(); // discard and go back
  };

  // =========================
  //   NEW: Undo-last modal
  // =========================
  const openUndoModal = () => {
    setUndoCode("");
    setUndoError("");
    setShowUndoModal(true);
  };

  const cancelUndo = () => {
    setShowUndoModal(false);
    setUndoCode("");
    setUndoError("");
  };

  const confirmUndo = () => {
    const code = undoCode.trim();
    if (!CAPTAIN_CODES.includes(code)) {
      setUndoError("Invalid captain code.");
      return;
    }
    setShowUndoModal(false);
    setUndoCode("");
    setUndoError("");
    onUndoLastEvent(); // 🔁 actually perform the undo
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

          {/* Safer Back */}
          <button
            className={hasProgress ? "danger-btn" : "secondary-btn"}
            onClick={handleBackClick}
            title={
              hasProgress
                ? "Cancel this match (captain code required)"
                : "Go back to fix teams"
            }
          >
            {hasProgress ? "Cancel Match" : "Change Teams"}
          </button>
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

          {/* 🔁 Goal vs Shibobo player selection */}
          {eventType === "goal" ? (
            <>
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
                >
                  <option value="">No assist</option>
                  {assistOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="field-row">
              <label>Player</label>
              <select
                value={scorerName}
                onChange={(e) => {
                  setScorerName(e.target.value);
                  setAssistName("");
                }}
              >
                <option value="">Select player</option>
                {playersForSelectedTeam.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className="primary-btn" onClick={handleAddEvent}>
            Add Event
          </button>
        </div>

        <div className="event-log">
          <div className="event-log-header">
            <h3>Current Match Events</h3>
            {/* 🔒 Undo requires captain code now */}
            <button className="secondary-btn" onClick={openUndoModal}>
              Undo last
            </button>
          </div>
          {currentEvents.length === 0 && <p className="muted">No events yet.</p>}
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

      {/* Undo last confirm modal */}
      {showUndoModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Undo last event?</h3>
            <p>Enter a captain code to confirm.</p>
            <div className="field-row">
              <label>Captain code</label>
              <input
                type="password"
                className="text-input"
                value={undoCode}
                onChange={(e) => {
                  setUndoCode(e.target.value);
                  setUndoError("");
                }}
                maxLength={4}
              />
              {undoError && <p className="error-text">{undoError}</p>}
            </div>
            <div className="actions-row">
              <button className="secondary-btn" onClick={cancelUndo}>
                Cancel
              </button>
              <button className="primary-btn" onClick={confirmUndo}>
                Confirm undo
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

      {/* Back confirm modal (discard match) */}
      {showBackModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Cancel this match?</h3>
            <p>
              You have started this match or logged events. To change teams you
              must <strong>discard</strong> the current match progress.
            </p>
            <div className="field-row">
              <label>Captain code</label>
              <input
                type="password"
                className="text-input"
                value={backCode}
                onChange={(e) => {
                  setBackCode(e.target.value);
                  setBackError("");
                }}
                maxLength={4}
              />
              {backError && <p className="error-text">{backError}</p>}
            </div>
            <div className="actions-row">
              <button className="secondary-btn" onClick={handleCancelBack}>
                Keep editing
              </button>
              <button className="danger-btn" onClick={handleConfirmDiscardAndBack}>
                Discard &amp; go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSeconds(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
