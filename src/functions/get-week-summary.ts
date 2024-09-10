import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db'
import { completedGoals, goals } from '../db/schema'
import dayjs from 'dayjs'

export async function getWeekSummary() {
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

  const goalsCompletedInWeek = db.$with('goals_completed_in_week').as(
    db
      .select({
        id: completedGoals.id,
        title: goals.title,
        completedAt: completedGoals.completedAt,
        completedAtDate: sql`
          DATE(${completedGoals.completedAt})
        `.as('completedAtDate'),
      })
      .from(completedGoals)
      .innerJoin(goals, eq(goals.id, completedGoals.goalId))
      .where(
        and(
          gte(completedGoals.completedAt, firstDayOfWeek),
          lte(completedGoals.completedAt, lastDayOfWeek)
        )
      )
  )

  const goalsCompletedByWeekDay = db.$with('goals_completed_by_week_day').as(
    db
      .select({
        completedAtDate: goalsCompletedInWeek.completedAtDate,
        completed: sql`
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', ${goalsCompletedInWeek.id},
            'title', ${goalsCompletedInWeek.title},
            'completedAt', ${goalsCompletedInWeek.completedAt}
            )
          )
      `.as('completed'),
      })
      .from(goalsCompletedInWeek)
      .groupBy(goalsCompletedInWeek.completedAtDate)
  )

  const result = await db
    .with(goalsCreatedUpToWeek, goalsCompletedInWeek, goalsCompletedByWeekDay)
    .select({
      completedAmount:
        sql`(SELECT COUNT(*) FROM ${goalsCompletedInWeek})`.mapWith(Number),
      totalAmount:
        sql`(SELECT SUM(${goalsCreatedUpToWeek.frequency}) FROM ${goalsCreatedUpToWeek})`.mapWith(
          Number
        ),
      goalsPerDay: sql`
        JSON_OBJECT_AGG(
          ${goalsCompletedByWeekDay.completedAtDate},
          ${goalsCompletedByWeekDay.completed}
        )
      `,
    })
    .from(goalsCompletedByWeekDay)

  return { summary: result }
}
