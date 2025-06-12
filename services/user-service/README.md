# User Service

멀티플레이어 게임을 위한 사용자 관리 마이크로서비스입니다.

## 기능

- 게스트 사용자 생성 및 관리
- JWT 기반 인증 시스템
- 사용자 프로필 관리
- 게임 통계 추적
- 차량 설정 관리
- 향후 확장: 사용자 등록, 아이템 시스템, 포인트 관리

## 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## 설치 및 실행

### 1. 의존성 설치
```bash
cd services/user-service
npm install
```

### 2. 환경변수 설정
```bash
cp env.example .env
# .env 파일을 편집하여 데이터베이스 설정 등을 수정
```

### 3. 데이터베이스 설정
PostgreSQL이 실행 중이어야 합니다.
```sql
CREATE DATABASE user_service;
CREATE USER user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE user_service TO user;
```

### 4. 서비스 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

## API 엔드포인트

### 공개 엔드포인트

#### POST /api/users/guest
게스트 사용자 생성
```json
{
  "username": "player123",
  "vehicleType": "fighter"
}
```

#### POST /api/users/login
사용자 로그인 (향후 확장)
```json
{
  "username": "user123",
  "password": "password"
}
```

### 인증 필요 엔드포인트

#### GET /api/users/profile
사용자 프로필 조회
```
Authorization: Bearer <token>
```

#### PUT /api/users/vehicle-settings
차량 설정 업데이트
```json
{
  "vehicleType": "heavy",
  "customization": {
    "vehicleColor": "#FF0000"
  }
}
```

#### POST /api/users/game-stats
게임 통계 업데이트
```json
{
  "kills": 5,
  "deaths": 2,
  "score": 1500,
  "playTime": 300,
  "pointsEarned": 100
}
```

#### GET /api/users/verify-token
토큰 검증

#### GET /api/users/list
사용자 목록 조회 (관리자용)
```
Query Parameters:
- page: 페이지 번호 (기본값: 1)
- limit: 페이지 크기 (기본값: 10)
- isGuest: 게스트 필터 (true/false)
- isActive: 활성 상태 필터 (true/false)
```

## 헬스체크

```bash
GET /health
```

## 데이터베이스 스키마

### users 테이블
- `id`: UUID (Primary Key)
- `username`: 사용자명 (Unique)
- `email`: 이메일 (Unique, Optional)
- `passwordHash`: 비밀번호 해시 (게스트는 NULL)
- `isGuest`: 게스트 여부
- `preferredVehicleType`: 선호 차량 타입
- `gameStats`: 게임 통계 (JSONB)
- `customization`: 커스터마이징 설정 (JSONB)
- `gamePoints`: 게임 포인트
- `lastLoginAt`: 마지막 로그인 시간
- `isActive`: 활성 상태
- `createdAt`: 생성 시간
- `updatedAt`: 수정 시간

## 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| NODE_ENV | 실행 환경 | development |
| PORT | 서버 포트 | 3002 |
| DB_HOST | 데이터베이스 호스트 | localhost |
| DB_PORT | 데이터베이스 포트 | 5432 |
| DB_NAME | 데이터베이스 이름 | user_service |
| DB_USER | 데이터베이스 사용자 | user |
| DB_PASS | 데이터베이스 비밀번호 | password |
| JWT_SECRET | JWT 시크릿 키 | (필수 변경) |
| JWT_EXPIRY | JWT 만료 시간 | 24h |

## 보안 고려사항

1. **JWT Secret**: 프로덕션에서는 반드시 강력한 시크릿 키 사용
2. **Rate Limiting**: 15분당 100 요청으로 제한
3. **CORS**: 필요에 따라 특정 도메인으로 제한
4. **Helmet**: 보안 헤더 자동 설정
5. **Input Validation**: Joi를 통한 입력값 검증

## 향후 확장 계획

1. **사용자 등록 시스템**: 이메일 인증, 비밀번호 재설정
2. **아이템 시스템**: 차량 커스터마이징, 무기 업그레이드
3. **포인트 시스템**: 게임 머니, 상점 기능
4. **소셜 기능**: 친구 시스템, 길드
5. **통계 대시보드**: 상세한 게임 분석

## 테스트

```bash
npm test
```

## 로그

개발 환경에서는 콘솔에 로그가 출력됩니다.
프로덕션 환경에서는 로그 레벨을 조정하여 성능을 최적화합니다. 