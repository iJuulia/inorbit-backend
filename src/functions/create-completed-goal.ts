import { and, gte, lte, count, eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { completedGoals, goals } from '../db/schema'
import dayjs from 'dayjs'

interface CreateCompletedGoalRequest {
  goalId: string
}

export async function createCompletedGoal({
  goalId,
}: CreateCompletedGoalRequest) {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()

  const completedGoalsCount = db.$with('completed_goals_count').as(
    db
      .select({
        goalId: completedGoals.goalId,
        completedCount: count(completedGoals.id).as('completedCount'),
      })
      .from(completedGoals)
      .where(
        and(
          gte(completedGoals.completedAt, firstDayOfWeek),
          lte(completedGoals.completedAt, lastDayOfWeek),
          eq(completedGoals.goalId, goalId)
        )
      )
      .groupBy(completedGoals.goalId)
  )

  const result = await db
    .with(completedGoalsCount)
    .select({
      frequency: goals.frequency,
      completedCount: sql`
          COALESCE(${completedGoalsCount.completedCount}, 0)
        `.mapWith(Number),
    })
    .from(goals)
    .leftJoin(completedGoalsCount, eq(completedGoalsCount.goalId, goals.id))
    .where(eq(goals.id, goalId))
    .limit(1)

  const { completedCount, frequency } = result[0]

  if (completedCount >= frequency) {
    throw new Error('Goal already completed this week.')
  }

  const insertResult = await db
    .insert(completedGoals)
    .values({
      goalId,
    })
    .returning()

  const completedGoal = insertResult[0]

  return { completedGoal }
}
