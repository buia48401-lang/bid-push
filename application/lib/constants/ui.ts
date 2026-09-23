/**
 * 通用 UI 展示常量 —— 与具体业务无关，供全应用引用。
 *
 * 🔴 页面与组件禁止硬编码这些字面量，一律 import 常量。
 */

/** 空值 / 非法值的统一占位符（表格、详情、格式化函数共用） */
export const EMPTY_PLACEHOLDER = '—';

/** 应用品牌：侧栏 logo 与页面标题（框架占位，接入真实项目时替换） */
export const APP_TITLE = '中后台管理框架';
export const APP_LOGO_MARK = '后';

/** 顶栏静态用户名（MVP 无登录，接入认证后替换为真实用户） */
export const APP_USER_NAME = '管理员';
