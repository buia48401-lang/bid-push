/**
 * 导航元数据的单一事实源：同时驱动侧栏菜单、顶栏面包屑与页面标题。
 * 依据 docs/product-design.md §3.1 / §3.2 —— 侧栏 4 个菜单项，公告详情页仍高亮「公告列表」。
 */

export type NavIcon = 'list' | 'bell' | 'send' | 'doc';

export type NavItem = {
  /** 唯一标识，用于匹配详情页归属 */
  key: string;
  /** 菜单与面包屑共用文案 */
  label: string;
  href: string;
  icon: NavIcon;
  /** 标题行「数据来源：xxx」中的表名 */
  sourceTable: string;
  /** 命中这些前缀即视为该菜单活跃（详情页据此复用父级高亮） */
  matchPrefixes: string[];
};

export type Crumb = {
  label: string;
  /** 省略即当前页，渲染为纯文本 */
  href?: string;
};

export type DetailRoute = {
  /** 详情路由前缀，含结尾斜杠 */
  prefix: string;
  /** 归属的菜单 key */
  parentKey: string;
  label: string;
};

export type NavResolution = {
  activeKey: string;
  title: string;
  sourceTable: string;
  crumbs: Crumb[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'announces',
    label: '公告列表',
    href: '/announces',
    icon: 'list',
    sourceTable: 'bid_announce',
    matchPrefixes: ['/announces'],
  },
  {
    key: 'subscriptions',
    label: '订阅管理',
    href: '/subscriptions',
    icon: 'bell',
    sourceTable: 'bid_subscription',
    matchPrefixes: ['/subscriptions'],
  },
  {
    key: 'push-logs',
    label: '推送记录',
    href: '/push-logs',
    icon: 'send',
    sourceTable: 'bid_push_log',
    matchPrefixes: ['/push-logs'],
  },
  {
    key: 'crawl-logs',
    label: '抓取日志',
    href: '/crawl-logs',
    icon: 'doc',
    sourceTable: 'bid_crawl_log',
    matchPrefixes: ['/crawl-logs'],
  },
];

export const DETAIL_ROUTES: DetailRoute[] = [
  { prefix: '/announces/', parentKey: 'announces', label: '公告详情' },
];

export const HOME_CRUMB: Crumb = { label: '首页', href: '/' };

const FALLBACK_ITEM = NAV_ITEMS[0];

/** 按 key 取菜单项，页面借此复用菜单文案与来源表名，避免标题硬编码 */
export function getNavItem(key: string): NavItem {
  return NAV_ITEMS.find((item) => item.key === key) ?? FALLBACK_ITEM;
}

/** 生成标题行的数据来源说明，extra 用于追加动态统计（如「今日新增 12 条」） */
export function sourceNote(sourceTable: string, extra?: string): string {
  return extra ? `数据来源：${sourceTable} · ${extra}` : `数据来源：${sourceTable}`;
}

/** 由 pathname 推导侧栏高亮项、面包屑与页面标题 */
export function resolveNavigation(pathname: string): NavResolution {
  const detail = DETAIL_ROUTES.find(
    (route) => pathname.startsWith(route.prefix) && pathname.length > route.prefix.length,
  );

  if (detail) {
    const parent = NAV_ITEMS.find((item) => item.key === detail.parentKey) ?? FALLBACK_ITEM;
    return {
      activeKey: parent.key,
      title: detail.label,
      sourceTable: parent.sourceTable,
      crumbs: [HOME_CRUMB, { label: parent.label, href: parent.href }, { label: detail.label }],
    };
  }

  const current =
    NAV_ITEMS.find((item) =>
      item.matchPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ),
    ) ?? FALLBACK_ITEM;

  return {
    activeKey: current.key,
    title: current.label,
    sourceTable: current.sourceTable,
    crumbs: [HOME_CRUMB, { label: current.label }],
  };
}
