# Multi-stage Dockerfile for Vehicle Game Microservices
# 단일 이미지로 User Service와 Game Service를 모두 포함

# Base stage - 공통 의존성
FROM node:18-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apk add --no-cache curl

# 공통 package.json 복사 (루트 레벨)
COPY package*.json ./

# 루트 의존성 설치 (개발 도구)
RUN npm ci --only=production

# User Service stage
FROM base AS user-service

# User Service 소스 복사
COPY services/user-service/package*.json ./services/user-service/
COPY services/user-service/src ./services/user-service/src/

# User Service 의존성 설치
WORKDIR /app/services/user-service
RUN npm ci --only=production

# 환경 변수 설정
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3002

# 포트 노출
EXPOSE 3002

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# User Service 시작
CMD ["npm", "start"]

# Game Service stage
FROM base AS game-service

# Game Service 소스 복사
COPY services/game-service/package*.json ./services/game-service/
COPY services/game-service/src ./services/game-service/src/

# Game Service 의존성 설치
WORKDIR /app/services/game-service
RUN npm ci --only=production

# 환경 변수 설정
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

# 포트 노출
EXPOSE 3001

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/status || exit 1

# Game Service 시작
CMD ["npm", "start"]

# Development stage (선택사항 - 개발용)
FROM base AS development

# 모든 서비스 소스 복사
COPY services/ ./services/
COPY client/ ./client/
COPY nginx.conf ./

# 개발 의존성 설치
WORKDIR /app/services/user-service
RUN npm ci

WORKDIR /app/services/game-service
RUN npm ci

WORKDIR /app

# 개발 모드 환경 변수
ENV NODE_ENV=development

# 개발용 포트들 노출
EXPOSE 3001 3002

# 개발 모드에서는 bash 실행
CMD ["/bin/sh"] 