import { db } from '../db'
import { goals } from '../db/schema'

interface CreateGoalRequest {
  title: string
  frequency: number
}

export async function createGoal({ title, frequency }: CreateGoalRequest) {
  const result = await db
    .insert(goals)
    .values({
      title,
      frequency,
    })
    .returning()

  const goal = result[0]

  return { goal }
}
