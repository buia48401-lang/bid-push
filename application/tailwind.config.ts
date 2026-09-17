import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * 设计 token 的唯一事实源是 app/globals.css 的 :root。
 * 本文件只做「token → 语义类名」的映射，禁止在此处写出新的色值。
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        /** < 1200px 时侧栏收窄、表格横向滚动 */
        narrow: { max: '1199px' },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Microsoft YaHei"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        title: ['20px', { lineHeight: '28px' }],
        'card-title': ['16px', { lineHeight: '24px' }],
        body: ['14px', { lineHeight: '22px' }],
        hint: ['12px', { lineHeight: '20px' }],
      },
      colors: {
        /** 品牌蓝：主按钮、链接、选中态 */
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          bg: 'var(--brand-bg)',
        },
        /** 页面底色 */
        page: 'var(--bg-page)',
        /** 卡片 */
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        /** 表头底色 */
        th: 'var(--th-bg)',
        /** 文本三级 */
        ink: {
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
        },
        /** 表格行分隔线 */
        line: 'var(--row-line)',
        /** 菜单 / 行 hover 底色 */
        'row-hover': 'var(--row-hover)',

        /** shadcn/ui 语义变量（映射自上方业务 token） */
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },

        /** 语义色 */
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          bg: 'var(--warn-bg)',
        },
        error: {
          DEFAULT: 'var(--error)',
          bg: 'var(--error-bg)',
        },
      },
      borderRadius: {
        /** 控件 3px */
        ctl: 'var(--radius-ctl)',
        /** 卡片 6px */
        card: 'var(--radius-card)',
        lg: 'var(--radius-card)',
        md: 'var(--radius-ctl)',
        sm: '2px',
      },
      spacing: {
        sidebar: 'var(--sidebar-w)',
        'sidebar-narrow': '200px',
        topbar: 'var(--topbar-h)',
        /** 表格行高 */
        row: '48px',
        /** 表头行高 */
        'th-row': '40px',
      },
      transitionDuration: {
        micro: '200ms',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
