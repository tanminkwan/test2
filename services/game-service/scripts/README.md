# Game Service - Scripts

이 디렉토리는 Game Service 관련 스크립트들을 포함합니다.

## 📁 파일 구조

```
scripts/
└── README.md             # 이 파일
```

## 📝 참고사항

Game Service는 현재 데이터베이스를 사용하지 않으므로 별도의 설정 스크립트가 필요하지 않습니다.

## 🚀 Game Service 시작

```bash
# Game Service 디렉토리에서 실행
cd services/game-service
npm start
```

## ⚙️ 환경 요구사항

- **Node.js 16+**
- **환경 변수**: `.env` 파일 설정
- **JWT_SECRET**: User Service와 동일한 값 필요

## 🔧 설정

Game Service는 다음 파일들로 설정됩니다:
- `sample.env` - 환경 변수 템플릿
- `src/config/game-config.yaml` - 게임 설정
- `src/index.js` - 메인 서버 파일

향후 필요에 따라 이 디렉토리에 Game Service 관련 유틸리티 스크립트들을 추가할 수 있습니다. 