import { searchPlaces } from "@/lib/search-utils"

export { searchPlaces }

export async function exampleAction() {
  try {
    // Perform some server-side action here
    return { success: true, message: "Action succeeded" }
  } catch (error) {
    console.error("Error in example action:", error)
    return { success: false, error: "Something went wrong" }
  }
}

