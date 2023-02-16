import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import { useRoute } from 'vue-router'
import {
  isArray,
  isPlainObject,
  isString,
  resolveLocalePath,
} from '@vuepress/shared'

import type {
  DefaultThemeData,
  DefaultThemeNormalPageFrontmatter,
  SeriesConfigArray,
  SeriesConfigObject,
  SeriesGroup,
  SeriesItem,
} from '../../types'

import { useNavLink } from './useNavLink'

import { usePageData } from '@vuepress-reco/vuepress-plugin-page/lib/client/composable'

export interface NavItem {
  text: string
  ariaLabel?: string
}

export interface NavGroup<T> extends NavItem {
  children: T[]
}

export interface NavLink extends NavItem {
  link: string
  rel?: string
  target?: string
}

export interface ResolvedSeriesItem extends Partial<NavLink> {
  isGroup?: boolean
  children?: ResolvedSeriesItem[]
}

export type SeriesItemsRef = ComputedRef<ResolvedSeriesItem[]>

export const seriesItemsSymbol: InjectionKey<SeriesItemsRef> = Symbol(
  'seriesItems'
)

export const useSeriesItems = (): SeriesItemsRef => {
  const seriesItems = inject(seriesItemsSymbol)
  if (!seriesItems) {
    throw new Error('useSeriesItems() is called without provider.')
  }
  return seriesItems
}

export const resolveSeriesItems = (
  frontmatter: DefaultThemeNormalPageFrontmatter,
  themeLocal: DefaultThemeData,
  series: SeriesConfigObject
): ResolvedSeriesItem[] => {
  const { series: autoSeries } = usePageData()
  // get series config from frontmatter > themeConfig
  let seriesConfig = frontmatter.series ?? themeLocal.series ?? {}

  seriesConfig = {
    ...autoSeries,
    ...seriesConfig,
  }

  // 解决

  // resolve series items according to the config
  if (frontmatter.home) {
    return []
  }

  // 自动生成 series 是对象的格式，所以不再兼容数组的格式
  // if (isArray(seriesConfig)) {
  //   return resolveArraySeriesItems(seriesConfig)
  // }

  if (isPlainObject(seriesConfig)) {
    return resolveMultiSeriesItems(seriesConfig)
  }

  return []
}

/**
 * Resolve series items if the config is an array
 */
export const resolveArraySeriesItems = (
  seriesConfig: SeriesConfigArray
): ResolvedSeriesItem[] => {
  const handleChildItem = (
    item: ResolvedSeriesItem | SeriesGroup | SeriesItem | string
  ): ResolvedSeriesItem => {
    let childItem: ResolvedSeriesItem
    if (isString(item)) {
      childItem = useNavLink(item)
    } else {
      childItem = item as ResolvedSeriesItem
    }

    if (childItem.isGroup && childItem.children) {
      return {
        ...childItem,
        children: childItem.children.map(handleChildItem),
      }
    }

    return childItem
  }

  return seriesConfig.map(
    (item): ResolvedSeriesItem => {
      if (isString(item)) {
        return useNavLink(item)
      }

      return {
        ...item,
        children: item.children.map(handleChildItem),
      }
    }
  )
}

/**
 * Resolve series items if the config is a key -> value (path-prefix -> array) object
 */
export const resolveMultiSeriesItems = (
  seriesConfig: SeriesConfigObject
): ResolvedSeriesItem[] => {
  const route = useRoute()
  const seriesPath = resolveLocalePath(seriesConfig, route.path)
  const matchedSeriesConfig = seriesConfig[seriesPath] ?? []

  return resolveArraySeriesItems(matchedSeriesConfig)
}
