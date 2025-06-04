# 3D 지형 시뮬레이션

Three.js를 사용하여 만든 간단한 3D 지형 시뮬레이션입니다.

## 기능

- 🏔️ **3D 지형**: 노이즈 함수를 사용한 자연스러운 언덕과 계곡
- ☁️ **볼륨 구름**: Three.js 공식 예제를 참조한 현실적인 3D 볼륨 구름
  - 3D Perlin 노이즈를 사용한 자연스러운 구름 형태
  - 실시간 애니메이션으로 구름이 변형되고 이동
  - 커스텀 셰이더로 구현된 고품질 렌더링
- 🌳 **나무**: 랜덤하게 배치된 나무들
- 💡 **조명**: 태양광과 환경광으로 자연스러운 조명
- 🎮 **카메라 컨트롤**: 마우스로 자유롭게 시점 조작

## 조작법

- **마우스 드래그**: 카메라 회전
- **마우스 휠**: 줌 인/아웃
- **우클릭 드래그**: 카메라 이동

## 실행 방법

### 1. npx serve 사용 (권장)
```bash
npx serve
```

### 2. 또는 다른 로컬 서버 사용
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js http-server
npm install -g http-server
http-server
```

### 3. 브라우저에서 접속
브라우저에서 `http://localhost:3000` (또는 해당 포트)로 접속하세요.

## 파일 구조

```
├── index.html      # 메인 HTML 파일
├── terrain.js      # Three.js 3D 지형 로직 (볼륨 구름 포함)
└── README.md       # 프로젝트 설명
```

## 기술 스택

- **Three.js**: 3D 그래픽 라이브러리
- **WebGL 셰이더**: 볼륨 구름을 위한 커스텀 버텍스/프래그먼트 셰이더
- **3D Perlin Noise**: 자연스러운 구름 형태 생성
- **HTML5/CSS3**: 웹 인터페이스
- **JavaScript**: 애니메이션 및 인터랙션 로직

## 특별한 기능

### 볼륨 구름
- [Three.js 공식 볼륨 구름 예제](https://github.com/mrdoob/three.js/blob/master/examples/webgl_volume_cloud.html)를 참조하여 구현
- 3D Perlin 노이즈 알고리즘으로 자연스러운 구름 형태 생성
- 실시간으로 구름이 변형되고 이동하는 애니메이션
- 여러 옥타브의 노이즈를 합성하여 디테일한 구름 표현
- 가장자리 페이드 효과로 부드러운 구름 경계

## 브라우저 호환성

- Chrome (권장)
- Firefox
- Safari
- Edge

WebGL과 GLSL 셰이더를 지원하는 모든 모던 브라우저에서 실행됩니다. 