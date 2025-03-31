"use server"

import { deleteDateSetAction } from "@/app/actions/date-sets"
import { redirect } from "next/navigation"

export async function deleteAndRedirectAction(dateSetId: string) {
  const result = await deleteDateSetAction(dateSetId)

  if (result.success) {
    redirect("/date-plans")
  }

  return result
}

