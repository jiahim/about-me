<template>
  <div v-if="isHomePage" class="dot-grid-background">
    <!-- 底层暗点 -->
    <div class="dot-layer dot-layer-dim" :style="dimLayerStyle"></div>

    <!-- 上层亮点（带遮罩） -->
    <div
      ref="brightLayer"
      class="dot-layer dot-layer-bright"
      :style="brightLayerStyle"
    ></div>

    <!-- 顶部渐变遮罩 -->
    <div class="top-gradient" :style="topGradientStyle"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useData, useRoute } from 'vitepress'

const { isDark } = useData()
const route = useRoute()
const brightLayer = ref(null)

// 检测是否为首页
const isHomePage = computed(() => {
  const path = route.path
  return path === '/' || path === '/zh/' || path === '/index.html' || path === '/zh/index.html'
})

// 检测是否为移动端
const isMobile = ref(false)

// 响应式配置
const config = computed(() => {
  if (isMobile.value) {
    return {
      spacing: '32px',
      dotSize: '1px',
      maskRadius: '120px'
    }
  }
  return {
    spacing: '26px',
    dotSize: '1px',
    maskRadius: '160px'
  }
})

// 颜色方案
const colors = computed(() => {
  if (isDark.value) {
    return {
      dimDot: 'rgba(148, 163, 184, 0.2)',
      brightDot: 'rgba(165, 180, 252, 0.8)'
    }
  }
  return {
    dimDot: 'rgba(148, 163, 184, 0.34)',
    brightDot: 'rgba(80, 100, 255, 0.76)'
  }
})

// 底层暗点样式
const dimLayerStyle = computed(() => ({
  background: `radial-gradient(circle, ${colors.value.dimDot} ${config.value.dotSize}, transparent ${config.value.dotSize})`,
  backgroundSize: `${config.value.spacing} ${config.value.spacing}`
}))

// 上层亮点样式
const brightLayerStyle = computed(() => ({
  background: `radial-gradient(circle, ${colors.value.brightDot} ${config.value.dotSize}, transparent ${config.value.dotSize})`,
  backgroundSize: `${config.value.spacing} ${config.value.spacing}`
}))

// 顶部渐变遮罩样式（使用 CSS 变量，自动响应 dark mode）
const topGradientStyle = computed(() => ({}))

// 性能优化：使用 RAF
let rafId = null
let hideTimeout = null // 隐藏光晕的定时器

// 更新遮罩位置（显示光晕）
const updateMask = (x, y) => {
  if (!brightLayer.value) return

  // 清除之前的隐藏定时器
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }

  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    const maskValue = `radial-gradient(${config.value.maskRadius} at ${x}px ${y}px, black 30%, transparent 70%)`
    brightLayer.value.style.maskImage = maskValue
    brightLayer.value.style.webkitMaskImage = maskValue // Safari 兼容
    brightLayer.value.style.opacity = '1' // 确保可见
  })

  // 鼠标停止后立即开始淡出
  hideTimeout = setTimeout(() => {
    hideMask()
  }, 200) // 200ms 防抖，避免微小抖动
}

// 隐藏光晕（淡出效果）
const hideMask = () => {
  if (!brightLayer.value) return

  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    brightLayer.value.style.opacity = '0'
  })
}

// 鼠标移动处理
const handleMouseMove = (e) => {
  updateMask(e.clientX, e.clientY)
}

// 触摸移动处理（移动端）
const handleTouchMove = (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0]
    updateMask(touch.clientX, touch.clientY)
  }
}

// 检测移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  if (!isHomePage.value) return

  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 桌面端使用 mousemove，移动端使用 touchmove
  if (isMobile.value) {
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
  } else {
    document.addEventListener('mousemove', handleMouseMove)
  }
})

onUnmounted(() => {
  if (rafId) {
    cancelAnimationFrame(rafId)
  }
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('touchmove', handleTouchMove)
})
</script>

<style scoped>
.dot-grid-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background-color: var(--vp-c-bg);
  transition: background-color 0.3s ease;
}

.dot-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.dot-layer-dim {
  z-index: 1;
}

.dot-layer-bright {
  z-index: 2;
  /* 初始状态：完全隐藏 */
  mask-image: radial-gradient(0px at 50% 50%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(0px at 50% 50%, black 30%, transparent 70%);
  /* 淡出动画：800ms */
  opacity: 1;
  transition: opacity 0.8s ease-out;
  /* 性能优化 */
  will-change: mask-image, opacity;
}

/* 顶部渐变遮罩 */
.top-gradient {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 120px;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(to bottom, var(--vp-c-bg) 0%, transparent 100%);
  transition: background 0.3s ease;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .dot-grid-background {
    /* 移动端可以选择降低透明度 */
    opacity: 0.8;
  }

  .top-gradient {
    /* 移动端渐变区域稍短 */
    height: 100px;
  }
}
</style>
