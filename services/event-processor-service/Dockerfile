FROM node:18-alpine

# 작업 디렉토리 생성
WORKDIR /usr/src/app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 로그 디렉토리 생성
RUN mkdir -p logs

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3003

# 컨테이너 포트 노출
EXPOSE 3003

# 서비스 실행
CMD ["npm", "start"] 