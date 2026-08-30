import { defineConfig, type DefaultTheme } from 'vitepress'
import { generateSidebarItems } from './tools'
import path from 'node:path'

export const en = defineConfig({
  themeConfig: {
    nav: [
      { text: 'home', link: '/en/' },
    ],
        sidebar: [
      {
        text: 'Contents',
        items: [
          {
            text: 'Reading Notes',
            items: generateSidebarItems(path.resolve(__dirname, '../../en/book')) as DefaultTheme.SidebarItem[]
          },
          {
            text: 'Technical Articles',
            items: generateSidebarItems(path.resolve(__dirname, '../../en/skill')) as DefaultTheme.SidebarItem[]
          },
          {
            text: 'Essays',
            items: generateSidebarItems(path.resolve(__dirname, '../../en/essay')) as DefaultTheme.SidebarItem[]
          },
          {
            text: 'Work Experience',
            items: generateSidebarItems(path.resolve(__dirname, '../../en/work')) as DefaultTheme.SidebarItem[]
          }
        ]
      }
    ],


  }
})

export const search: DefaultTheme.AlgoliaSearchOptions['locales'] = {
    en: {
    placeholder: 'Search docs',
    translations: {
      button: {
        buttonText: 'Search docs',
        buttonAriaLabel: 'Search docs'
      },
      modal: {
        searchBox: {
          resetButtonTitle: 'Clear query',
          resetButtonAriaLabel: 'Clear query',
          cancelButtonText: 'Cancel',
          cancelButtonAriaLabel: 'Cancel'
        },
        startScreen: {
          recentSearchesTitle: 'Recent searches',
          noRecentSearchesText: 'No recent searches',
          saveRecentSearchButtonTitle: 'Save to recent searches',
          removeRecentSearchButtonTitle: 'Remove from recent searches',
          favoriteSearchesTitle: 'Favorite',
          removeFavoriteSearchButtonTitle: 'Remove from favorites'
        },
        errorScreen: {
          titleText: 'Unable to fetch results',
          helpText: 'You might want to check your network connection'
        },
        footer: {
          selectText: 'Select',
          navigateText: 'Navigate',
          closeText: 'Close',
          searchByText: 'Search by'
        },
        noResultsScreen: {
          noResultsText: 'No results found',
          suggestedQueryText: 'Try searching for',
          reportMissingResultsText: 'Believe this query should return results?',
          reportMissingResultsLinkText: 'Let us know'
        }
      }
    }
  }
}
