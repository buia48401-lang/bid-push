'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { resolveNavigation } from '@/lib/constants/nav';

/** 顶栏面包屑：首页 / 当前页（详情页为三级），路径推导复用导航元数据 */
export function Breadcrumb() {
  const pathname = usePathname();
  const { crumbs } = resolveNavigation(pathname);

  return (
    <nav aria-label="面包屑" className="flex items-center gap-1.5 text-body text-ink-3">
      {crumbs.map((crumb, index) => (
        <Fragment key={`${crumb.label}-${index}`}>
          {index > 0 ? (
            <span aria-hidden="true" className="text-ink-3">
              /
            </span>
          ) : null}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="text-ink-3 transition-colors duration-micro hover:text-brand"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-ink-3">{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
