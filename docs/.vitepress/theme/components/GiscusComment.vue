<template>
  <div v-if="!isSettingsPreview && comments?.enabled && comments.provider === 'giscus'" style="margin-top: 24px">
    <Giscus
      id="comments"
      :repo="comments.repository"
      :repo-id="comments.repositoryId"
      :category="comments.category"
      :category-id="comments.categoryId"
      :mapping="comments.mapping"
      reactions-enabled="1"
      emit-metadata="0"
      input-position="top"
      loading="lazy"
      :theme="isDark ? 'dark' : 'light'"
      :key="route.path"
    ></Giscus>
  </div>
</template>

<script setup>
import Giscus from '@giscus/vue'
import { computed } from 'vue'
import { useRoute, useData } from 'vitepress'

const route = useRoute()
const { isDark, theme } = useData()
const comments = computed(() => theme.value.comments)
const isSettingsPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('site-preview') === '1'
</script>
