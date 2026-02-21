<template>
  <ClientOnly>
    <header class="max-w-275 mx-auto px-5 py-6 flex items-end justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 shrink-0 overflow-hidden rounded-full border border-border bg-bg">
          <img
            :src="useRuntimeConfig().public.apiImg"
            alt="Avatar"
            class="w-full h-full object-cover block"
          />
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="m-0 text-2xl tracking-wide font-normal">
            {{ useRuntimeConfig().public.apiName }}
          </h1>
          <p class="m-0 mt-1 text-xs text-[#666872]">
            {{ useRuntimeConfig().public.apiDescription }}
          </p>
        </div>
      </div>
    </header>
  </ClientOnly>
</template>
