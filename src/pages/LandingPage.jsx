// src/pages/LandingPage.jsx

import React, { useState } from "react";
import { getTeamById } from "../core/teams.js";
import TurfKingsLogo from "../assets/TurfKings_logo.jpg";
import TurfKingsTeam from "../assets/TurfKings.jpg"; // 👈 new import

const CAPTAIN_CODES = ["11", "22", "3333"]; // any captain can approve pairing override

export function LandingPage({
  teams,
  currentMatchNo,
  currentMatch,
  results,
  streaks,
  onUpdatePairing,
  onStartMatch,
  onGoToStats,
  onGoToSquads,
  onOpenBackupModal,
}) {
  const { teamAId, teamBId, standbyId } = currentMatch;

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pendingMatch, setPendingMatch] = useState(null);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingError, setPairingError] = useState("");

  const teamA = getTeamById(teams, teamAId);
  const teamB = getTeamById(teams, teamBId);
  const standbyTeam = getTeamById(teams, standbyId);

  const matchesPlayed = results.length;
  const lastResult = matchesPlayed > 0 ? results[matchesPlayed - 1] : null;

  // Base ribbon text
  let ribbonText = `Next: ${teamA.label} vs ${teamB.label}  |    \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0     Standby: ${standbyTeam.label}`;

  // Last result segment
  if (lastResult) {
    const lastA = getTeamById(teams, lastResult.teamAId);
    const lastB = getTeamById(teams, lastResult.teamBId);
    const status =
      lastResult.isDraw && !lastResult.winnerId
        ? "draw"
        : `won by ${
            lastResult.winnerId === lastA.id ? lastA.label : lastB.label
          }`;

    ribbonText += ` \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0  •  Last: ${lastA.label} ${lastResult.goalsA}-${lastResult.goalsB} ${lastB.label} (${status})`;
  } else {
    ribbonText += " \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0  •  No results yet – first game incoming!";
  }

  // Top scorer segment (if available)
  const topScorer = streaks?.topScorer;
  if (topScorer) {
    const topScorerName = topScorer.name || topScorer.playerName;
    const topScorerGoals = topScorer.goals;

    if (topScorerName && topScorerGoals != null) {
      ribbonText += ` \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0  •  Top scorer: ${topScorerName} (${topScorerGoals} goals)`;
    }
  }

  const requestPairChange = (candidateMatch) => {
    setPendingMatch(candidateMatch);
    setPairingCode("");
    setPairingError("");
    setShowPairingModal(true);
  };

  const handleTeamAChange = (e) => {
    const newA = e.target.value;
    if (newA === teamAId) return;

    const allowedForB = teams.filter((t) => t.id !== newA);
    const newB = allowedForB.some((t) => t.id === teamBId)
      ? teamBId
      : allowedForB[0].id;
    const newStandby =
      teams.find((t) => t.id !== newA && t.id !== newB)?.id || standbyId;

    requestPairChange({
      teamAId: newA,
      teamBId: newB,
      standbyId: newStandby,
    });
  };

  const handleTeamBChange = (e) => {
    const newB = e.target.value;
    if (newB === teamBId) return;

    const allowedForA = teams.filter((t) => t.id !== newB);
    const newA = allowedForA.some((t) => t.id === teamAId)
      ? teamAId
      : allowedForA[0].id;
    const newStandby =
      teams.find((t) => t.id !== newA && t.id !== newB)?.id || standbyId;

    requestPairChange({
      teamAId: newA,
      teamBId: newB,
      standbyId: newStandby,
    });
  };

  const cancelPairingChange = () => {
    setShowPairingModal(false);
    setPendingMatch(null);
    setPairingCode("");
    setPairingError("");
  };

  const confirmPairingChange = () => {
    if (!pendingMatch) return;
    if (!CAPTAIN_CODES.includes(pairingCode.trim())) {
      setPairingError("Invalid captain code.");
      return;
    }
    onUpdatePairing(pendingMatch);
    cancelPairingChange();
  };

  // dropdown options (no same team both sides)
  const optionsForTeamA = teams.filter((t) => t.id !== teamBId);
  const optionsForTeamB = teams.filter((t) => t.id !== teamAId);

  return (
    <div className="page landing-page">
      <header className="header">
        <div className="header-title">
          <img
            src={TurfKingsLogo}
            alt="Turf Kings logo"
            className="tk-logo"
          />
          <h1>Turf Kings 5-A-Side</h1>
        </div>
        <p className="subtitle">Grand Central – 17:30–19:00</p>
      </header>

      <section className="card">
        <h2>Upcoming Match #{currentMatchNo}</h2>

        <div className="match-setup-row">
          <div className="team-select">
            <label>On-field Team 1</label>
            <select value={teamAId} onChange={handleTeamAChange}>
              {optionsForTeamA.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label} (c: {team.captain})
                </option>
              ))}
            </select>
          </div>

          <span className="vs-label">vs</span>

          <div className="team-select">
            <label>On-field Team 2</label>
            <select value={teamBId} onChange={handleTeamBChange}>
              {optionsForTeamB.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label} (c: {team.captain})
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="standby-label">
          Standby Team:{" "}
          <strong>
            {standbyTeam.label} (c: {standbyTeam.captain})
          </strong>
        </p>

        <div className="actions-row">
          <button className="primary-btn" onClick={onStartMatch}>
            Start Match
          </button>
          <button className="secondary-btn" onClick={onGoToStats}>
            View Stats
          </button>
          <button className="secondary-btn" onClick={onGoToSquads}>
            Manage Squads
          </button>
          <button className="secondary-btn" onClick={onOpenBackupModal}>
            Save / Clear Data
          </button>
        </div>
      </section>

      <section className="ticker">
        <div className="ticker-inner">
          <span>{ribbonText}</span>
        </div>
      </section>

      {/* 👇 New team picture section */}
      <section className="team-photo">
        <img
          src={TurfKingsTeam}
          alt="Turf Kings squad"
          className="team-photo-img"
        />
      </section>

      {showPairingModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm Match Override</h3>
            <p>Changing the next pairing requires a captain code.</p>
            <div className="field-row">
              <label>Captain code</label>
              <input
                type="password"
                className="text-input"
                value={pairingCode}
                onChange={(e) => {
                  setPairingCode(e.target.value);
                  setPairingError("");
                }}
              />
              {pairingError && <p className="error-text">{pairingError}</p>}
            </div>
            <div className="actions-row">
              <button className="secondary-btn" onClick={cancelPairingChange}>
                Cancel
              </button>
              <button className="primary-btn" onClick={confirmPairingChange}>
                Confirm change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
