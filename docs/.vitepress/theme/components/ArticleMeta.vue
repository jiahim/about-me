<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

const { frontmatter, theme } = useData()
const route = useRoute()
const isArticle = computed(() => Boolean(frontmatter.value.date) && !route.path.endsWith('/'))
const author = computed(() => frontmatter.value.author || theme.value.authorName || 'Jia him')
const section = computed(() => (theme.value.sectionLabels || [])
  .filter((item: { route: string }) => route.path.startsWith(item.route))
  .sort((left: { route: string }, right: { route: string }) => right.route.length - left.route.length)[0])
</script>

<template>
  <div v-if="isArticle" class="article-meta" aria-label="文章信息" data-settings-preview-target="author">
    <nav class="article-breadcrumb" aria-label="面包屑">
      <a href="/">首页</a><span aria-hidden="true">/</span>
      <a v-if="section" :href="section.route">{{ section.name }}</a><span v-if="section" aria-hidden="true">/</span>
      <span>{{ frontmatter.title }}</span>
    </nav>
    <span>作者：{{ author }}</span>
    <time :datetime="String(frontmatter.date)">发布：{{ frontmatter.date }}</time>
    <time v-if="frontmatter.updatedAt" :datetime="String(frontmatter.updatedAt)">更新：{{ frontmatter.updatedAt }}</time>
  </div>
</template>
