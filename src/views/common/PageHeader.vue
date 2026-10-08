<template>
  <!-- Header Section Begin -->
  <header class="header" ref="header">
    <!--메뉴-->
    <nav class="header_menu">
      <!--로고-->
      <div class="header_logo left">
        <RouterLink :to="selList[0].path"><img src="@/assets/images/logo.png" alt="" /></RouterLink>
      </div>

      <!--메뉴-->
      <div class="header_text center">
        <ul>
          <li v-for="(item, i) in selList" :key="i">
            <RouterLink
              ref="btns"
              :to="item.path"
              :class="{ active: isActive(item.path) }"
              v-if="i !== 0 && (item.role == null || checkUserRole())">
              {{ item.text }}
            </RouterLink>
          </li>
        </ul>
      </div>

      <!-- 로그인 -->
      <div class="header_right right">
        <div class="header_right_widget">
          <!-- 로그인되어 있을 때 -->
          <template v-if="isLoggedIn == true">
            <img
              src="@/assets/images/default_profile.png"
              style="width: 30px; height: 30px; border-radius: 100%"
              @click="goToMyPage" />
            <div style="margin-left: 2px; font-size: 12px">
              <div style="line-height: 14px; margin: 4px 0px 0px 0px">{{ username }}님</div>

              <button type="button" @click="logout">로그아웃</button>
            </div>
          </template>
          <!-- 로그인되어 있지 않을 때 -->
          <template v-else>
            <router-link to="/login">
              <div style="display: flex">
                <div class="myinfo-box-div">
                  <img
                    src="@/assets/images/default_profile.png"
                    style="width: 30px; height: 30px; border-radius: 100%" />
                </div>
                <div style="font-size: 14px; margin: 4px" @click="login">로그인</div>
              </div>
            </router-link>
          </template>
        </div>
      </div>
    </nav>
  </header>
  <!-- Header Section End -->
</template>

<script>
import { useRoute } from "vue-router";
import base64 from "base-64";
import axios from "axios";
import { authState, clearSession, syncSession } from "@/services/authSession";

export default {
  setup() {
    const route = useRoute();

    function isActive(path) {
      //console.log('path : ' + path.split('/')[1]);
      //console.log('route.path : ' + route.path.split('/')[1]);
      return path.split("/")[1] == route.path.split("/")[1];
    }

    function checkUserRole() {
      let userId = sessionStorage.getItem("userId");

      // 로그인 안한 경우이거나 일반 사용자인 경우
      if (userId == null || !userId.includes("admin")) return false;

      return true;
    }

    return {
      isActive,
      checkUserRole,
    };
  },
  data() {
    return {
      username: "",
      selList: [
        {
          id: 0,
          text: "HOME",
          path: "/",
        },
        {
          id: 1,
          text: "NOTICE",
          path: "/notice",
        },
        {
          id: 2,
          text: "PERSONAL COLOR",
          path: "/personal",
        },
        {
          id: 3,
          text: "STYLE MATCH",
          path: "/style",
        },
        {
          id: 4,
          text: "FACE MATCH",
          path: "/face",
        },
        {
          id: 5,
          text: "COMMUNITY",
          path: "/board",
        },
        {
          id: 6,
          text: "ADMIN",
          path: "/admin",
          role: "admin",
        },
      ],
    };
  },
  beforeUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
  },
  mounted() {
    //이벤트 : 이 컴포넌트(App.vue)마운트 되면
    window.addEventListener("scroll", this.handleScroll);
    this.login();
  },
  computed: {
    isLoggedIn() {
      return authState.isLoggedIn;
    },
  },
  watch: {
    $route(to, from) {
      const headerElement = this.$refs.header;

      if (to.name === "PageMain") {
        headerElement.classList.add("main");
      } else {
        headerElement.classList.remove("main");
      }
    },
    isLoggedIn(loggedIn) {
      if (!loggedIn) {
        this.username = "";
        this.userId = null;
        this.userProfile = null;
      } else {
        this.login();
      }
    },
  },
  methods: {
    handleScroll() {
      const scrT = window.pageYOffset || document.documentElement.scrollTop;
      const headerElement = this.$refs.header;

      if (scrT === 0) {
        headerElement.classList.remove("background");
        headerElement.classList.add("backgroundnone");
      } else {
        headerElement.classList.remove("backgroundnone");
        headerElement.classList.add("background");
      }
    },
    goToMyPage() {
      // 이미지 클릭 시 '/member/mypage'로 이동
      this.$router.push("/member/mypage");
    },

    // 로그인
    async login() {
      // 세션이 유효하지 않으면 사용자 정보 초기화
      if (!syncSession()) {
        this.username = "";
        this.userId = null;
        this.userProfile = null;
        return;
      }

      const userId = authState.userId;
      const token = sessionStorage.getItem("accessToken");

      try {
        // 로그인한 사용자의 상세 정보 조회
        const { data } = await this.$axios.get(`/member/${encodeURIComponent(userId)}`);

        // 로그아웃 또는 재로그인 후 도착한 이전 요청의 응답은 무시
        if (!authState.isLoggedIn || sessionStorage.getItem("accessToken") !== token) {
          return;
        }

        // 조회한 회원 정보를 컴포넌트 상태에 반영
        this.userId = userId;
        this.username = data.userName;
        this.userProfile = data.userProfile;
      } catch (error) {
        console.error("회원 정보 조회 실패: ", error);
      }
    },

    // 로그아웃
    logout() {
      // 세션 정보 삭제 후 로그인 페이지로 이동
      clearSession();
      this.$router.replace("/login");
    },
  },
};
</script>

<style>
@import "@/assets/css/header.css";
</style>
