import { redirect } from 'next/navigation';

/** 根路径统一进入公告列表（侧栏第一个菜单项） */
export default function RootPage() {
  redirect('/announces');
}
