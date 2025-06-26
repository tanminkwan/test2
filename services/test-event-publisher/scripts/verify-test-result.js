#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const now = new Date();
const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

const scenarios = [
  {
    name: 'vehicleDestroyed',
    table: 'game_events',
    eventType: 'vehicleDestroyed',
    countQuery: `SELECT COUNT(*) FROM game_events WHERE event_type = 'vehicleDestroyed' AND timestamp >= NOW() - INTERVAL '2 minutes';`
  },
  {
    name: 'playerScoreChanged',
    table: 'game_events',
    eventType: 'playerScoreChanged',
    countQuery: `SELECT COUNT(*) FROM game_events WHERE event_type = 'playerScoreChanged' AND timestamp >= NOW() - INTERVAL '2 minutes';`
  },
  {
    name: 'billboardDestroyed',
    table: 'billboard_destructions',
    countQuery: `SELECT COUNT(*) FROM billboard_destructions WHERE destroyed_at >= NOW() - INTERVAL '2 minutes';`
  },
  {
    name: 'itemBoxDestroyed',
    table: 'item_box_destructions',
    countQuery: `SELECT COUNT(*) FROM item_box_destructions WHERE destroyed_at >= NOW() - INTERVAL '2 minutes';`
  }
];

const playerStatsQuery = `SELECT player_id, kills, deaths, score FROM player_statistics ORDER BY score DESC LIMIT 5;`;

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASS || 'app123!@#',
    database: process.env.DB_NAME || 'game_statistics',
  });
  await client.connect();

  console.log('=== 이벤트 DB 검증 결과 ===');

  for (const scenario of scenarios) {
    const res = await client.query(scenario.countQuery);
    const count = res.rows[0].count;
    console.log(`- ${scenario.name} (${scenario.table}): ${count} rows`);
  }

  // 주요 플레이어 통계
  const statsRes = await client.query(playerStatsQuery);
  console.log('\n상위 플레이어 통계:');
  console.table(statsRes.rows);

  await client.end();
}

main().catch(err => {
  console.error('검증 중 오류:', err);
  process.exit(1);
}); 