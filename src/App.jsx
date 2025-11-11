// src/App.jsx
import React, { useEffect, useState } from "react";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LiveMatchPage } from "./pages/LiveMatchPage.jsx";
import { StatsPage } from "./pages/StatsPage.jsx";
import { SquadsPage } from "./pages/SquadsPage.jsx";
import {
  loadState,
  saveState,
  createDefaultState,
} from "./storage/gameRepository.js";
import { computeNextFromResult } from "./core/rotation.js";

const PAGE_LANDING = "landing";
const PAGE_LIVE = "live";
const PAGE_STATS = "stats";
const PAGE_SQUADS = "squads";

const MASTER_CODE = "3333"; // Nkululeko admin code

export default function App() {
  const [page, setPage] = useState(PAGE_LANDING);
  const [state, setState] = useState(() => loadState());

  // backup / clear modal
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [backupError, setBackupError] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const {
    teams,
    currentMatchNo,
    currentMatch,
    currentEvents,
    results,
    allEvents,
    streaks,
  } = state;

  // Landing handlers
  const handleUpdatePairing = (match) => {
    setState((prev) => ({
      ...prev,
      currentMatch: match,
    }));
  };

  const handleStartMatch = () => {
    setPage(PAGE_LIVE);
  };

  const handleGoToStats = () => {
    setPage(PAGE_STATS);
  };

  const handleGoToSquads = () => {
    setPage(PAGE_SQUADS);
  };

  const handleBackToLanding = () => {
    setPage(PAGE_LANDING);
  };

  // Live match handlers
  const handleAddEvent = (event) => {
    setState((prev) => ({
      ...prev,
      currentEvents: [...prev.currentEvents, event],
    }));
  };

  const handleDeleteEvent = (index) => {
    setState((prev) => {
      const copy = [...prev.currentEvents];
      copy.splice(index, 1);
      return { ...prev, currentEvents: copy };
    });
  };

  const handleUndoLastEvent = () => {
    setState((prev) => {
      if (prev.currentEvents.length === 0) return prev;
      const copy = [...prev.currentEvents];
      copy.pop();
      return { ...prev, currentEvents: copy };
    });
  };

  const handleConfirmEndMatch = (summary) => {
    setState((prev) => {
      const { teamAId, teamBId, standbyId, goalsA, goalsB } = summary;

      const rotationResult = computeNextFromResult(prev.streaks, {
        teamAId,
        teamBId,
        standbyId,
        goalsA,
        goalsB,
      });

      const newMatchNo = prev.currentMatchNo + 1;

      const committedEvents = prev.currentEvents.map((e) => ({
        ...e,
        matchNo: prev.currentMatchNo,
      }));

      const newResult = {
        matchNo: prev.currentMatchNo,
        teamAId,
        teamBId,
        standbyId,
        goalsA,
        goalsB,
        winnerId: rotationResult.winnerId,
        isDraw: rotationResult.isDraw,
      };

      return {
        ...prev,
        currentMatchNo: newMatchNo,
        currentMatch: {
          teamAId: rotationResult.nextTeamAId,
          teamBId: rotationResult.nextTeamBId,
          standbyId: rotationResult.nextStandbyId,
        },
        streaks: rotationResult.updatedStreaks,
        currentEvents: [],
        allEvents: [...prev.allEvents, ...committedEvents],
        results: [...prev.results, newResult],
      };
    });

    setPage(PAGE_LANDING);
  };

  // Squad updates (only Nkululeko should be giving the code – enforced in SquadsPage)
  const handleUpdateTeams = (updatedTeams) => {
    setState((prev) => ({
      ...prev,
      teams: updatedTeams,
    }));
  };

  // Backup / clear logic
  const openBackupModal = () => {
    setBackupCode("");
    setBackupError("");
    setShowBackupModal(true);
  };

  const closeBackupModal = () => {
    setShowBackupModal(false);
    setBackupCode("");
    setBackupError("");
  };

  const downloadStateToFile = () => {
    if (typeof window === "undefined") return;
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const ts =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "-" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0");
    a.href = url;
    a.download = `turfkings-5aside-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleBackupSaveOnly = () => {
    if (backupCode.trim() !== MASTER_CODE) {
      setBackupError("Invalid admin code.");
      return;
    }
    downloadStateToFile();
    closeBackupModal();
  };

  const handleBackupSaveAndClear = () => {
    if (backupCode.trim() !== MASTER_CODE) {
      setBackupError("Invalid admin code.");
      return;
    }
    downloadStateToFile();
    setState(createDefaultState());
    closeBackupModal();
  };

  return (
    <div className="app-root">
      {page === PAGE_LANDING && (
        <LandingPage
          teams={teams}
          currentMatchNo={currentMatchNo}
          currentMatch={currentMatch}
          results={results}
          streaks={streaks}
          onUpdatePairing={handleUpdatePairing}
          onStartMatch={handleStartMatch}
          onGoToStats={handleGoToStats}
          onGoToSquads={handleGoToSquads}
          onOpenBackupModal={openBackupModal}
        />
      )}

      {page === PAGE_LIVE && (
        <LiveMatchPage
          teams={teams}
          currentMatchNo={currentMatchNo}
          currentMatch={currentMatch}
          currentEvents={currentEvents}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
          onUndoLastEvent={handleUndoLastEvent}
          onConfirmEndMatch={handleConfirmEndMatch}
          onBackToLanding={handleBackToLanding}
          onGoToStats={handleGoToStats}
        />
      )}

      {page === PAGE_STATS && (
        <StatsPage
          teams={teams}
          results={results}
          allEvents={allEvents}
          onBack={handleBackToLanding}
        />
      )}

      {page === PAGE_SQUADS && (
        <SquadsPage
          teams={teams}
          onUpdateTeams={handleUpdateTeams}
          onBack={handleBackToLanding}
        />
      )}

      {showBackupModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Save / Clear Turf Kings Data</h3>
            <p>
              Save all matches, events and squads to a file. You can optionally
              clear the browser after saving to reclaim space.
            </p>
            <div className="field-row">
              <label>Admin code (Nkululeko)</label>
              <input
                type="password"
                className="text-input"
                value={backupCode}
                onChange={(e) => {
                  setBackupCode(e.target.value);
                  setBackupError("");
                }}
              />
              {backupError && <p className="error-text">{backupError}</p>}
            </div>
            <div className="actions-row">
              <button className="secondary-btn" onClick={closeBackupModal}>
                Cancel
              </button>
              <button className="secondary-btn" onClick={handleBackupSaveOnly}>
                Save only
              </button>
              <button
                className="primary-btn"
                onClick={handleBackupSaveAndClear}
              >
                Save &amp; clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
