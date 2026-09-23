/**
 * demo_item 示例模块类型 —— 演示「数据库行（snake_case）↔ 接口字段（camelCase）」的双形态约定。
 *
 * - `DemoRow`：数据库行的 TypeScript 镜像，列名 snake_case，可空性对齐建表语句；
 * - `DemoItem`：接口输出形态，字段 camelCase，页面与组件只消费本类型。
 *
 * 建表 SQL 见 application/README.md「示例数据」一节。
 */

/** demo_item 数据库行形态（snake_case） */
export type DemoRow = {
  id: number;
  title: string | null;
  category: string | null;
  /** numeric 列经 PostgREST 可能返回字符串，归一化见 lib/data/normalize.ts */
  amount: number | string | null;
  status: string | null;
  created_at: string | null;
};

/** demo_item 接口输出形态（camelCase，页面直接消费） */
export type DemoItem = {
  id: number;
  title: string;
  category: string;
  amount: number | null;
  status: string;
  /** ISO 串；空值与非法值已归一为 null */
  createdAt: string | null;
};
