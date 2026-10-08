import axios from 'axios';
import { expireSession } from '@/services/authSession';

// axios 인스턴스 생성
const axiosIns = axios.create({
  baseURL: 'http://localhost:2222',
  timeout: 360000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: HTTP 요청을 보내기 전에 인증 정보를 추가
axiosIns.interceptors.request.use(config => {
  const token = sessionStorage.getItem('accessToken');
  const enrollType = sessionStorage.getItem('enrollType');

  config.headers = config.headers || {};

  // 호출자가 Authorization을 직접 지정했다면 덮어쓰지 않음
  if (token && !config.headers.Authorization) {
    if(enrollType === 'KAKAO'){
      // 카카오 로그인 사용자의 인증 정보 설정
      config.headers.Authorization = `Kakao ${token}`;
      config.headers.userId = sessionStorage.getItem('userId');
    } else {
      // 일반 JWT 인증 방식
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config;
});

// 응답 인터셉터: 응답 성공 또는 실패 시 공통 처리
axiosIns.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const authorization = String(
      error.config?.headers?.Authorization || ''
    );

    const currentToken = sessionStorage.getItem('accessToken');

    // 현재 사용 중인 JWT로 요청했는데 401 응답을 받은 경우 세션 만료 처리
    // 이전 로그인 요청의 지연된 401 응답으로 새 세션이 종료되는 것을 방지
    if (
      status === 401
      && currentToken
      && authorization === `Bearer ${currentToken}`
    ) {
      expireSession();
    }

    // 오류를 호출한 쪽으로 전달하여 개별 예외 처리
    return Promise.reject(error);
  }
);

export default axiosIns;
