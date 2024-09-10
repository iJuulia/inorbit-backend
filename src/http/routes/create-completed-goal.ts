import { z } from 'zod'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { createCompletedGoal } from '../../functions/create-completed-goal'

export const createCompletedGoalRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/completed-goals',
    {
      schema: {
        body: z.object({
          goalId: z.string(),
        }),
      },
    },
    async request => {
      const { goalId } = request.body

      await createCompletedGoal({
        goalId,
      })
    }
  )
}
