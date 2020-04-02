import {
  getBreadCrumbList,
  setTagNavListInLocalstorage,
  getMenuByRouter,
  getTagNavListFromLocalstorage,
  getHomeRoute,
  // getNextRoute,
  routeHasExist,
  routeEqual,
  getRouteTitleHandled,
  localSave,
  localRead
} from "@/libs/util";
import { saveErrorLogger } from "@/api/data";
import router from "@/router";
// import routers from "@/router/routers";
import { dynamicRouterAdd } from "@/libs/router-util"; // ①添 引入加载菜单(仅mock时用)

import config from "@/config";
const { homeName } = config;

const closePage = (state, route) => {
  // const nextRoute = getNextRoute(state.tagNavList, route);
  state.tagNavList = state.tagNavList.filter(item => {
    return !routeEqual(item, route);
  });
  router.push(state.tagNavList[state.tagNavList.length - 1]); // 改造：动态标签关闭
  // router.push(nextRoute);
};

export default {
  state: {
    breadCrumbList: [],
    tagNavList: [],
    homeRoute: {},
    local: localRead("local"),
    errorList: [],
    hasReadErrorPage: false,
    menuList: [] // 拿到的路由数据
  },
  getters: {
    menuList: (state, getters, rootState) =>
      // getMenuByRouter(routers, rootState.user.access), // 原始方法
      getMenuByRouter(dynamicRouterAdd("app.js"), rootState.user.access), // 根据路由加载菜单(仅mock时用)
    errorCount: state => state.errorList.length
  },
  mutations: {
    // 配置面包屑导航
    setBreadCrumb(state, route) {
      state.breadCrumbList = getBreadCrumbList(route, state.homeRoute);
    },
    // 配置主页route
    setHomeRoute(state, routes) {
      state.homeRoute = getHomeRoute(routes, homeName);
    },
    // 配置标签导航
    setTagNavList(state, list) {
      let tagList = [];
      if (list) {
        tagList = [...list];
      } else {
        tagList = getTagNavListFromLocalstorage() || [];
      }
      // if (tagList[0] && tagList[0].name !== homeName) tagList.shift();  // 改造：动态标签关闭
      let homeTagIndex = tagList.findIndex(item => item.name === homeName);
      if (homeTagIndex > 0) {
        let homeTag = tagList.splice(homeTagIndex, 1)[0];
        tagList.unshift(homeTag);
      }
      state.tagNavList = tagList;
      setTagNavListInLocalstorage([...tagList]);
    },
    // 关闭标签导航
    closeTag(state, route) {
      let tag = state.tagNavList.filter(item => routeEqual(item, route));
      route = tag[0] ? tag[0] : null;
      if (!route) return;
      closePage(state, route);
    },
    // 添加标签导航
    addTag(state, { route, type = "unshift" }) {
      let router = getRouteTitleHandled(route);
      if (!routeHasExist(state.tagNavList, router)) {
        if (type === "push") {
          if (router.name === homeName) state.tagNavList.unshift(router);
          else state.tagNavList.push(router);
        } else {
          if (router.name === homeName) state.tagNavList.unshift(router);
          else state.tagNavList.splice(1, 0, router);
        }
        setTagNavListInLocalstorage([...state.tagNavList]);
      }
    },
    setLocal(state, lang) {
      localSave("local", lang);
      state.local = lang;
    },
    addError(state, error) {
      state.errorList.push(error);
    },
    setHasReadErrorLoggerStatus(state, status = true) {
      state.hasReadErrorPage = status;
    },
    // 根据路由和权限，生成左侧菜单
    setMenuList(state, data) {
      state.menuList = getMenuByRouter(data.menuList, data.access);
    }
  },
  actions: {
    addErrorLog({ commit, rootState }, info) {
      if (!window.location.href.includes("error_logger_page")) {
        commit("setHasReadErrorLoggerStatus", false);
      }
      const {
        user: { token, userId, userName }
      } = rootState;
      let data = {
        ...info,
        time: Date.parse(new Date()),
        token,
        userId,
        userName
      };
      saveErrorLogger(info).then(() => {
        commit("addError", data);
      });
    },
    updateMenuList({ commit, rootState }, routes) {
      console.log("动态添加路由：", routes);
      // 动态添加路由 - 真正添加路由（不会立刻刷新，需要手动往router.options.routes里添加数据）
      router.addRoutes(routes);
      // 手动添加路由数据
      routes.forEach(route => {
        if (!router.options.routes.some(_route => _route.path === route.path)) {
          router.options.routes.push(route);
        }
      });
      // 动态渲染菜单数据
      commit("setMenuList", {
        menuList: routes,
        access: rootState.user.access
      });
    }
  }
};
