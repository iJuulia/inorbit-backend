import dayjs from 'dayjs'
import { client, db } from '.'
import { completedGoals, goals } from './schema'

async function seed() {
  await db.delete(completedGoals)
  await db.delete(goals)

  const result = await db
    .insert(goals)
    .values([
      { title: 'Acordar cedo', frequency: 5 },
      { title: 'Me exercitar', frequency: 2 },
      { title: 'Meditar', frequency: 3 },
    ])
    .returning()

  const startOfWeek = dayjs().startOf('week')

  await db.insert(completedGoals).values([
    { goalId: result[0].id, completedAt: startOfWeek.toDate() },
    { goalId: result[1].id, completedAt: startOfWeek.add(1, 'day').toDate() },
  ])
}

seed().finally(() => {
  client.end()
})
