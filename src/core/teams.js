// src/core/teams.js

export const TEAMS = [
    {
      id: "team-enoch",
      label: "Team-Enoch",
      captain: "Enoch",
      players: ["Enoch", "Uhone", "Mark", "Barlo", "Nkumbuzo", "Munya"],
    },
    {
      id: "team-mdu",
      label: "Team-Mdu",
      captain: "Mdu",
      players: ["Mdu", "Scott", "Chad", "Taku", "Josh", "Humbu"],
    },
    {
      id: "team-nk",
      label: "Team-NK",
      captain: "Nkululeko",
      players: ["Nkululeko", "Zizou", "Dayaan", "Dr Babs", "Kolobe", "Anathi"],
    },
  ];
  
  export function getTeamById(teams, id) {
    return teams.find((t) => t.id === id);
  }
  