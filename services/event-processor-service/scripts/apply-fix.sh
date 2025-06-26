#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}시스템 수정 적용 스크립트${NC}"
echo -e "${BLUE}=======================================${NC}"

# 현재 디렉토리
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $DIR/..

# 1. 데이터베이스 스키마 업데이트
echo -e "\n${YELLOW}1. 데이터베이스 스키마 업데이트 중...${NC}"

DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_USER=${POSTGRES_USER:-app_user}
DB_PASS=${POSTGRES_PASSWORD:-"app123!@#"}
DB_NAME=${POSTGRES_DB:-game_statistics}

export PGPASSWORD=$DB_PASS

echo -e "연결 정보: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# 스키마 업데이트 실행
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "./scripts/update-schema.sql"
if [ $? -ne 0 ]; then
  echo -e "${RED}스키마 업데이트 중 오류가 발생했습니다.${NC}"
else
  echo -e "${GREEN}데이터베이스 스키마가 성공적으로 업데이트되었습니다.${NC}"
fi

# 2. 서비스 재시작
echo -e "\n${YELLOW}2. 서비스 재시작 중...${NC}"

# 현재 실행 중인 서비스 중지
if [ -f "pid.txt" ]; then
  PID=$(cat pid.txt)
  if ps -p $PID > /dev/null; then
    echo "서비스 중지 중 (PID: $PID)..."
    kill -15 $PID
    sleep 2
    if ps -p $PID > /dev/null; then
      echo "강제 종료 중..."
      kill -9 $PID
    fi
  else
    echo "이전에 실행된 서비스를 찾을 수 없습니다."
  fi
fi

# 의존성 설치 확인
echo "의존성 확인/설치 중..."
npm install

# 서비스 재시작
echo "서비스 시작 중..."
npm start &
echo $! > pid.txt

echo -e "${GREEN}서비스가 성공적으로 재시작되었습니다.${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}모든 수정이 완료되었습니다!${NC}"
echo -e "${BLUE}=======================================${NC}" 