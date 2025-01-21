import type { SerializeFrom } from '@remix-run/cloudflare'
import { useFetcher } from '@remix-run/react'
import type { AppData } from '@remix-run/react/dist/data'
import React from 'react'

type FetcherData<T> = NonNullable<SerializeFrom<T>>
type ResolveFunction<T> = (value: FetcherData<T>) => void

export function useFetcherWithPromise<TData = AppData>(opts?: Parameters<typeof useFetcher>[0]) {
  const fetcher = useFetcher<TData>(opts)
  const resolveRef = React.useRef<ResolveFunction<TData>>()
  const promiseRef = React.useRef<Promise<FetcherData<TData>>>()

  if (!promiseRef.current) {
    promiseRef.current = new Promise<FetcherData<TData>>((resolve) => {
      resolveRef.current = resolve
    })
  }

  const resetResolver = React.useCallback(() => {
    promiseRef.current = new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [promiseRef, resolveRef])

  const submit = React.useCallback(
    async (...args: Parameters<typeof fetcher.submit>) => {
      fetcher.submit(...args)
      return promiseRef.current
    },
    [fetcher, promiseRef]
  )

  React.useEffect(() => {
    if (fetcher.state === 'idle') {
      if (fetcher.data) {
        resolveRef.current?.(fetcher.data)
      }
      resetResolver()
    }
  }, [fetcher, resetResolver])

  return { ...fetcher, submit }
}