"use client"

import * as React from "react"
import { useEffect, useState, useReducer } from "react"

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

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "UPDATE_TOAST"; toast: Toast }
  | { type: "DISMISS_TOAST"; id: string }
  | { type: "REMOVE_TOAST"; id: string }

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case "ADD_TOAST":
      return [...state, action.toast].slice(-TOAST_LIMIT)
    case "UPDATE_TOAST":
      return state.map((toast) => (toast.id === action.toast.id ? action.toast : toast))
    case "DISMISS_TOAST":
      return state.map((toast) => (toast.id === action.id ? { ...toast, open: false } : toast))
    case "REMOVE_TOAST":
      return state.filter((toast) => toast.id !== action.id)
    default:
      return state
  }
}

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

  return toast
}

export function useToast() {
  const [mounted, setMounted] = useState(false)
  const [toastState, dispatch] = useReducer(toastReducer, [])

  useEffect(() => {
    setMounted(true)
    return () => {
      setMounted(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (toastState.length > 0) {
        dispatch({ type: "REMOVE_TOAST", id: toastState[0].id })
      }
    }, TOAST_REMOVE_DELAY)

    return () => clearInterval(interval)
  }, [toastState])

  return {
    toasts: toastState,
    toast: (props: ToastProps) => {
      const newToast = toast(props)
      dispatch({ type: "ADD_TOAST", toast: newToast })
      return newToast
    },
    dismiss: (id: string) => dispatch({ type: "DISMISS_TOAST", id }),
  }
}

