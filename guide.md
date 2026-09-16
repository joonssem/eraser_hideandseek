# 교실 대소동: 사라진 지우개 찾기 ver2.0 - 서버 구축 및 배포 가이드

- **제작자**: 하루담이
- **제작/배포일**: 2026. 07. 12
- **공식 배포 URL**: [https://find-eraser2.netlify.app/](https://find-eraser2.netlify.app/)

---

## 1. Firebase 실시간 데이터베이스 설정
- Firebase 콘솔(https://console.firebase.google.com)에서 새 프로젝트 생성
- '데이터베이스 및 스토리지' -> 'Realtime Database' 생성 (테스트 모드)
  - 위치: `asia-southeast1` (싱가포르) 등 아시아 권역 추천
- 데이터베이스 '규칙' 탭에서 아래 코드로 수정 후 게시:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
- 프로젝트 설정(톱니바퀴 ⚙️)에서 웹 앱(`</>`) 추가 후 `firebaseConfig` 객체 발급

## 2. index.html 파일 수정 지시
- 파일 내 "선생님 설정 구역" 검색 (`firebaseConfig`)
- 기존 `<script>` 태그 안의 `firebaseConfig` 부분을 새로 발급받은 정보로 교체
- `TEACHER_CODE` 값을 방 만들기용 커스텀 비밀번호로 수정 후 저장

## 3. 정적 호스팅 배포
- 파일명을 웹 표준 시작 파일인 `index.html`로 구성
- GitHub Pages, Netlify Drop(`app.netlify.com/drop`), Cloudflare Pages 등을 이용하여 웹에 배포
