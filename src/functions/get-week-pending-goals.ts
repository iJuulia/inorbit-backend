import dayjs from 'dayjs'
import { db } from '../db'
import { completedGoals, goals } from '../db/schema'
import { and, count, eq, gte, lte, sql } from 'drizzle-orm'

export async function getWeekPendingGoals() {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()

  const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        frequency: goals.frequency,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(lte(goals.createdAt, lastDayOfWeek))
  )

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
          lte(completedGoals.completedAt, lastDayOfWeek)
        )
      )
      .groupBy(completedGoals.goalId)
  )

  const pendingGoals = await db
    .with(goalsCreatedUpToWeek, completedGoalsCount)
    .select({
      id: goalsCreatedUpToWeek.id,
      title: goalsCreatedUpToWeek.title,
      frequency: goalsCreatedUpToWeek.frequency,
      completedCount: sql`
          COALESCE(${completedGoalsCount.completedCount}, 0)
        `.mapWith(Number),
    })
    .from(goalsCreatedUpToWeek)
    .leftJoin(
      completedGoalsCount,
      eq(completedGoalsCount.goalId, goalsCreatedUpToWeek.id)
    )

  return { pendingGoals }
}
