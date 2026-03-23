import { PICKS, PLAYER_ORDER } from "./picks-data.mjs";

export const ROUND_DEFINITIONS = [
  { label: "1st Round", points: 1 },
  { label: "2nd Round", points: 2 },
  { label: "Sweet 16", points: 4 },
  { label: "Elite 8", points: 8 },
  { label: "Final 4", points: 16 },
  { label: "Championship", points: 32 },
];

export const TOURNAMENT_DATES_2026 = [
  "20260317",
  "20260318",
  "20260319",
  "20260320",
  "20260321",
  "20260322",
  "20260326",
  "20260327",
  "20260328",
  "20260329",
  "20260404",
  "20260406",
];

const ESPN_SCOREBOARD_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&dates=";

const TEAM_ALIASES = new Map([
  ["CONNECTICUT", "UCONN"],
  ["IOWA STATE", "IOWA ST"],
  ["MICHIGAN STATE", "MICHIGAN ST"],
  ["OHIO STATE", "OHIO ST"],
  ["UTAH STATE", "UTAH ST"],
  ["NORTH DAKOTA STATE", "NORTH DAKOTA ST"],
  ["CALIFORNIA BAPTIST", "CAL BAPTIST"],
  ["VIRGINIA COMMONWEALTH", "VCU"],
  ["MIAMI FL", "MIAMI"],
  ["MIAMI FLA", "MIAMI"],
  ["MIAMI OH", "MIAMI OF OHIO"],
  ["MIAMI OHIO", "MIAMI OF OHIO"],
  ["PRAIRIE VIEW", "PRAIRIE VIEW A AND M"],
  ["ST JOHNS", "ST JOHNS"],
  ["SAINT JOHNS", "ST JOHNS"],
]);

export function normalizeTeamName(value) {
  if (!value) return "";
  let normalized = String(value).toUpperCase().trim();
  normalized = normalized.replace(/&/g, " AND ");
  normalized = normalized.replace(/['.]/g, "");
  normalized = normalized.replace(/[()]/g, " ");
  normalized = normalized.replace(/-/g, " ");
  normalized = normalized.replace(/\bTHE\b/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();
  if (TEAM_ALIASES.has(normalized)) {
    return TEAM_ALIASES.get(normalized);
  }
  return normalized;
}

export function parseRoundFromHeadline(headline) {
  const text = String(headline || "");
  if (/first four/i.test(text)) return "First Four";
  if (/(1st round|first round|round of 64)/i.test(text)) return "1st Round";
  if (/(2nd round|second round|round of 32)/i.test(text)) return "2nd Round";
  if (/sweet 16/i.test(text)) return "Sweet 16";
  if (/(elite 8|elite eight)/i.test(text)) return "Elite 8";
  if (/final four/i.test(text)) return "Final 4";
  if (/(championship game|national championship|title game|finals)/i.test(text)) return "Championship";
  return null;
}

export function buildPayloadFromActualWinners(actualWinnersByRound) {
  const rounds = ROUND_DEFINITIONS.map((round) => ({
    label: round.label,
    values: [],
  }));

  const players = PLAYER_ORDER.map((name) => {
    let totalPoints = 0;

    ROUND_DEFINITIONS.forEach((round, roundIndex) => {
      const actualSet = new Set((actualWinnersByRound[round.label] || []).map(normalizeTeamName));
      const correctCount = (PICKS[name][round.label] || []).filter((pick) => actualSet.has(normalizeTeamName(pick))).length;
      rounds[roundIndex].values.push(correctCount);
      totalPoints += correctCount * round.points;
    });

    return { name, points: totalPoints };
  });

  const gamesEntered = ROUND_DEFINITIONS.reduce((sum, round) => sum + (actualWinnersByRound[round.label] || []).length, 0);
  const totalPossiblePoints = ROUND_DEFINITIONS.reduce((sum, round, index) => {
    const gameCounts = [32, 16, 8, 4, 2, 1];
    return sum + gameCounts[index] * round.points;
  }, 0);

  return {
    title: "Total Points",
    totalPossiblePoints,
    gamesEntered,
    players,
    rounds,
    updatedAt: new Date().toISOString(),
    source: "auto-sync",
  };
}

export async function fetchCompletedWinnersByRound(fetchImpl = fetch) {
  const actualWinnersByRound = Object.fromEntries(
    ROUND_DEFINITIONS.map((round) => [round.label, []])
  );

  for (const date of TOURNAMENT_DATES_2026) {
    const response = await fetchImpl(`${ESPN_SCOREBOARD_BASE}${date}`);
    if (!response.ok) {
      throw new Error(`Scoreboard fetch failed for ${date}: ${response.status}`);
    }

    const data = await response.json();
    const events = Array.isArray(data?.events) ? data.events : [];

    for (const event of events) {
      const competition = event?.competitions?.[0];
      if (!competition) continue;
      if (competition?.status?.type?.completed !== true) continue;

      const headline =
        competition?.notes?.[0]?.headline ||
        event?.notes?.[0]?.headline ||
        competition?.type?.text ||
        "";

      const roundLabel = parseRoundFromHeadline(headline);
      if (!roundLabel || roundLabel === "First Four") continue;

      const winnerCompetitor = competition?.competitors?.find((team) => team?.winner === true);
      const winnerName =
        winnerCompetitor?.team?.location ||
        winnerCompetitor?.team?.shortDisplayName ||
        winnerCompetitor?.team?.displayName ||
        null;

      if (!winnerName) continue;

      actualWinnersByRound[roundLabel].push(winnerName);
    }
  }

  return actualWinnersByRound;
}

export async function buildLivePayload(fetchImpl = fetch) {
  const actualWinnersByRound = await fetchCompletedWinnersByRound(fetchImpl);
  return buildPayloadFromActualWinners(actualWinnersByRound);
}
