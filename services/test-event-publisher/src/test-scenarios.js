#!/usr/bin/env node

import { loadScenarios } from './scenarios/index.js';
import { RedisPublisher } from './utils/RedisPublisher.js';
import dotenv from 'dotenv';
import chalk from 'chalk';

// 환경 변수 로드
dotenv.config();

// Redis 설정
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || '',
  channel: process.env.REDIS_CHANNEL || 'game-events'
};

// 모든 시나리오 테스트
async function testAllScenarios() {
  console.log(chalk.blue('===== 테스트 시나리오 실행 =====\n'));
  
  // Redis 발행자 초기화
  const publisher = new RedisPublisher(redisConfig);
  console.log(chalk.yellow(`Redis 연결: ${redisConfig.host}:${redisConfig.port}, 채널: ${redisConfig.channel}`));
  
  // 시나리오 로드
  const scenarios = loadScenarios();
  const scenarioNames = Object.keys(scenarios);
  
  console.log(chalk.yellow(`총 ${scenarioNames.length}개 시나리오 테스트 시작\n`));
  
  // 각 시나리오 테스트
  for (const name of scenarioNames) {
    const scenario = scenarios[name];
    console.log(chalk.green(`\n[${name}] 시나리오 테스트 - ${scenario.description}`));
    
    try {
      // 테스트 이벤트 생성
      const event = scenario.generateEvent(0);
      console.log(chalk.cyan('이벤트 생성:'));
      console.log(JSON.stringify(event, null, 2));
      
      // 이벤트 발행
      const success = await publisher.publishEvent(event.type, event.data);
      
      if (success) {
        console.log(chalk.green('✓ 이벤트 발행 성공'));
      } else {
        console.log(chalk.red('✗ 이벤트 발행 실패'));
      }
    } catch (err) {
      console.error(chalk.red(`✗ 오류 발생: ${err.message}`));
    }
  }
  
  // 정리
  await publisher.close();
  console.log(chalk.blue('\n===== 테스트 완료 ====='));
}

// 테스트 실행
testAllScenarios().catch(err => {
  console.error(chalk.red(`치명적 오류: ${err.message}`));
  process.exit(1);
}); 