export function useGetApi() {
  const result = ref<
    | {
      code: number
      msg: string
      data: [
        {
          id: number
          name: string
          description: string
          docurl: string
          url: string
          method: string
          count: string
          status: number
        },
      ]
      timestamp: number
    }
    | any
  >()

  const getApi = async () => {
    try {
      const res = await $fetch('/api/v1/test/getApiDB', {
        method: 'GET',
      })
      result.value = res
    }
    catch (error) {
      throw error
    }
  }

  return {
    result,
    getApi,
  }
}
