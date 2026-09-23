import { redirect } from 'next/navigation';

/** 根路径统一进入第一个菜单项（示例模块） */
export default function RootPage() {
  redirect('/demo');
}
