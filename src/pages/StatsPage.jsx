// src/pages/StatsPage.jsx

import React, { useMemo } from "react";

export function StatsPage({ teams, results, allEvents, onBack }) {
  const teamStats = useMemo(
    () => computeTeamStats(teams, results),
    [teams, results]
  );
  const playerStats = useMemo(
    () => computePlayerStats(teams, allEvents),
    [teams, allEvents]
  );

  return (
    <div className="page stats-page">
      <header className="header">
        <h1>Stats</h1>
      </header>

      <section className="card">
        <h2>Team Leaderboard</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>GP</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map((t) => (
                <tr key={t.teamId}>
                  <td>
                    <strong>{t.label}</strong> (c: {t.captain})
                  </td>
                  <td>{t.gp}</td>
                  <td>{t.w}</td>
                  <td>{t.d}</td>
                  <td>{t.l}</td>
                  <td>{t.gf}</td>
                  <td>{t.ga}</td>
                  <td>{t.gd}</td>
                  <td>{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Player Leaderboard</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Goals</th>
                <th>Assists</th>
                <th>Shibobos</th>
                <th>G+A+S</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map((p) => (
                <tr key={p.key}>
                  <td>{p.player}</td>
                  <td>{p.teamLabel}</td>
                  <td>{p.goals}</td>
                  <td>{p.assists}</td>
                  <td>{p.shibobos}</td>
                  <td>{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="actions-row">
        <button className="primary-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

function computeTeamStats(teams, results) {
  const teamMap = {};
  teams.forEach((t) => {
    teamMap[t.id] = {
      teamId: t.id,
      label: t.label,
      captain: t.captain,
      gp: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      pts: 0,
    };
  });

  results.forEach((r) => {
    const a = teamMap[r.teamAId];
    const b = teamMap[r.teamBId];
    if (!a || !b) return;

    a.gp += 1;
    b.gp += 1;
    a.gf += r.goalsA;
    a.ga += r.goalsB;
    b.gf += r.goalsB;
    b.ga += r.goalsA;

    if (r.goalsA > r.goalsB) {
      a.w += 1;
      b.l += 1;
      a.pts += 3;
    } else if (r.goalsB > r.goalsA) {
      b.w += 1;
      a.l += 1;
      b.pts += 3;
    } else {
      a.d += 1;
      b.d += 1;
      a.pts += 1;
      b.pts += 1;
    }
  });

  return Object.values(teamMap)
    .map((t) => ({
      ...t,
      gd: t.gf - t.ga,
    }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdDiff = b.gd - a.gd;
      if (gdDiff !== 0) return gdDiff;
      return b.gf - a.gf;
    });
}

function computePlayerStats(teams, allEvents) {
  const map = {};

  allEvents.forEach((e) => {
    const team = teams.find((t) => t.id === e.teamId);
    const teamLabel = team ? team.label : "";
    const key = `${e.teamId}::${e.scorer}`;

    if (!map[key]) {
      map[key] = {
        key,
        player: e.scorer,
        teamLabel,
        goals: 0,
        assists: 0,
        shibobos: 0,
      };
    }

    if (e.type === "goal") {
      map[key].goals += 1;
      if (e.assist) {
        const assistKey = `${e.teamId}::${e.assist}`;
        if (!map[assistKey]) {
          map[assistKey] = {
            key: assistKey,
            player: e.assist,
            teamLabel,
            goals: 0,
            assists: 0,
            shibobos: 0,
          };
        }
        map[assistKey].assists += 1;
      }
    }

    if (e.type === "shibobo") {
      map[key].shibobos += 1;
    }
  });

  return Object.values(map)
    .map((p) => ({
      ...p,
      total: p.goals + p.assists + p.shibobos,
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.goals - a.goals;
    });
}
