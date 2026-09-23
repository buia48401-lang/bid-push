/**
 * 数据库行 → 接口字段的通用归一化函数（框架核心资产，与具体表无关）。
 *
 * ⚠️ 归一化不是「美化」而是防御：
 * - numeric 列经 PostgREST 可能返回字符串；
 * - 时间列可能为 null 或非法串，直接交给前端会导致 Invalid Date；
 * - 单字段脏数据不应让整个列表返回 500，因此异常只降级为 null / 空串。
 *
 * 使用位置约定：snake_case → camelCase 的映射只发生在 lib/data/**，
 * 页面、组件、Route Handler 一律直接消费 camelCase 类型。
 */

/** numeric 列 → number；空值、空白串、非数字串均归一为 null */
export function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  // 注意 Number('') === 0，空白串必须先拦掉，否则「未填写金额」会变成 0
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/** 计数列 → number；脏数据回退 0，保证统计不出现 NaN */
export function toCount(value: number | string | null | undefined): number {
  return toNumber(value) ?? 0;
}

/** NOT NULL 文本列 → string；null / undefined 归一为空串 */
export function toText(value: string | null | undefined): string {
  return typeof value === 'string' ? value : '';
}

/** 可空文本列 → string | null；空白串视为 null，避免前端渲染出空字段 */
export function toNullableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return value;
}

/** 时间列 → ISO 串；空值与非法值归一为 null */
export function toIsoString(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

/** boolean 列 → boolean；异常值回退 fallback */
export function toBoolean(value: boolean | null | undefined, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** snake_case → camelCase（JSONB 内部键保持 snake_case 时的通用转换） */
export function snakeToCamel(key: string): string {
  return key.replace(/_+([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/** camelCase → snake_case（写入库前的反向映射） */
export function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

/** 长文本列截断：超过 maxLength 截断，空值返回 null */
export function truncateText(value: string | null | undefined, maxLength: number): string | null {
  const text = toNullableText(value);

  if (text === null) {
    return null;
  }

  return text.length <= maxLength ? text : text.slice(0, maxLength);
}

/** 判断空值：null / undefined / 空串 */
export function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}
