// composables/useSiteTime.ts

export const useSiteTime = () => {
  const nowTime = ref<string>('')
  const upTime = ref<string>('')
  let timer: NodeJS.Timeout | null = null

  const startClock = (): void => {
    const start: number = new Date('2019-07-31T08:00:00+08:00').getTime()
    const pad = (n: number): string => String(n).padStart(2, '0')

    const update = (): void => {
      const now: Date = new Date()
      nowTime.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      let diff: number = Math.max(0, now.getTime() - start)
      const days: number = Math.floor(diff / 86400000)
      const years: number = Math.floor(days / 365)
      const displayDays: number = days % 365
      const h: number = Math.floor((diff % 86400000) / 3600000)
      const m: number = Math.floor((diff % 3600000) / 60000)
      upTime.value = `${years} 年 ${displayDays} 天 ${h} 小时 ${m} 分`
    }

    update()
    timer = setInterval(update, 1000)
  }

  // 销毁时清除定时器
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { nowTime, upTime, startClock }
}
