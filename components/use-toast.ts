"use client"

import * as React from "react"

import { useEffect, useState } from "react"

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000000

type ToastProps = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

let count = 0

function generateId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type Toast = ToastProps & {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const toasts: Toast[] = []

export function toast({ title, description, variant, action }: ToastProps) {
  const id = generateId()

  const toast: Toast = {
    id,
    title,
    description,
    variant,
    action,
    open: true,
    onOpenChange: (open) => {
      if (!open) {
        toast.open = false
      }
    },
  }

  toasts.push(toast)

  return toast
}

export function useToast() {
  const [mounted, setMounted] = useState(false)
  const [toastState, setToastState] = useState<Toast[]>([])

  useEffect(() => {
    setMounted(true)
    return () => {
      setMounted(false)
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      setToastState([...toasts])
    }
  }, [mounted, toasts])

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: "REMOVE_TOAST", id: toasts[0]?.id })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    toasts: toastState,
    toast,
  }
}

