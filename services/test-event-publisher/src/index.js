#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { RedisPublisher } from './utils/RedisPublisher.js';
import { loadScenarios } from './scenarios/index.js';

// 환경 변수 로드
dotenv.config();

// 명령행 인터페이스 설정
const program = new Command();

program
  .name('test-event-publisher')
  .description('Redis에 게임 이벤트를 발행하는 테스트 도구')
  .version('1.0.0');

program
  .option('-s, --scenario <name>', '실행할 시나리오 이름', process.env.DEFAULT_SCENARIO || 'vehicle-destroyed')
  .option('-c, --count <number>', '발행할 이벤트 수', parseInt, parseInt(process.env.EVENT_COUNT) || 10)
  .option('-i, --interval <ms>', '이벤트 발행 간격 (ms)', parseInt, parseInt(process.env.EVENT_INTERVAL) || 1000)
  .option('-l, --list', '사용 가능한 시나리오 목록 표시')
  .option('-r, --repeat', '시나리오 반복 실행 (Ctrl+C로 종료)')
  .option('-v, --verbose', '상세 로깅 활성화');

program.parse();

const options = program.opts();

// Redis 발행자 설정
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || '',
  channel: process.env.REDIS_CHANNEL || 'game-events'
};

// 시나리오 로드
const scenarios = loadScenarios();

// 시나리오 목록 표시 옵션
if (options.list) {
  console.log(chalk.bold('\n사용 가능한 시나리오:'));
  Object.keys(scenarios).forEach(name => {
    console.log(`  ${chalk.green(name)} - ${scenarios[name].description}`);
  });
  console.log();
  process.exit(0);
}

// 선택된 시나리오 확인
const scenarioName = options.scenario;
if (!scenarios[scenarioName]) {
  console.error(chalk.red(`오류: '${scenarioName}' 시나리오를 찾을 수 없습니다.`));
  console.log(chalk.yellow('사용 가능한 시나리오 목록을 보려면 --list 옵션을 사용하세요.'));
  process.exit(1);
}

const scenario = scenarios[scenarioName];
const publisher = new RedisPublisher(redisConfig);

console.log(chalk.bold.blue('\n테스트 이벤트 발행자 시작\n'));
console.log(`시나리오: ${chalk.green(scenarioName)} - ${scenario.description}`);
console.log(`이벤트 수: ${options.count}`);
console.log(`간격: ${options.interval}ms`);
console.log(`Redis 채널: ${redisConfig.channel}`);
console.log();

// 이벤트 발행 함수
async function publishEvents() {
  try {
    let eventCount = 0;
    const totalEvents = options.repeat ? Infinity : options.count;
    
    // 이벤트 발행 간격 설정
    const intervalId = setInterval(async () => {
      if (eventCount >= totalEvents) {
        clearInterval(intervalId);
        await cleanup();
        return;
      }
      
      try {
        // 시나리오에서 이벤트 생성
        const event = scenario.generateEvent(eventCount);
        const eventType = event.type;
        const eventData = event.data;
        
        // 이벤트 발행
        const success = await publisher.publishEvent(eventType, eventData);
        
        if (success) {
          eventCount++;
          if (options.verbose) {
            console.log(chalk.green(`[${eventCount}] 이벤트 발행 성공: ${eventType}`));
            console.log(JSON.stringify(eventData, null, 2));
          } else {
            process.stdout.write(chalk.green('.'));
            if (eventCount % 50 === 0) process.stdout.write('\n');
          }
        } else {
          console.error(chalk.red(`이벤트 발행 실패: ${eventType}`));
        }
      } catch (err) {
        console.error(chalk.red(`이벤트 생성/발행 오류: ${err.message}`));
      }
    }, options.interval);
    
    // 종료 처리
    process.on('SIGINT', async () => {
      clearInterval(intervalId);
      await cleanup();
      process.exit(0);
    });
  } catch (err) {
    console.error(chalk.red(`오류 발생: ${err.message}`));
    process.exit(1);
  }
}

// 정리 함수
async function cleanup() {
  console.log(chalk.blue('\n\n종료 중...'));
  await publisher.close();
  console.log(chalk.blue('연결이 종료되었습니다.'));
}

// 이벤트 발행 시작
publishEvents().catch(err => {
  console.error(chalk.red(`치명적 오류: ${err.message}`));
  process.exit(1);
}); 