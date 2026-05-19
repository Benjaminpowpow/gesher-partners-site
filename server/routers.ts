import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Exit Brief PDF request — triggers email delivery via the REST route
  // The actual /api/exit-brief and /api/contact are Express routes (see server/routes/exitBrief.ts)
  exitBrief: router({
    requestPdf: publicProcedure
      .input(
        z.object({
          briefId: z.string(),
          name: z.string().min(1),
          email: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        // Delegate to the REST endpoint internally
        const response = await fetch(`http://localhost:${process.env.PORT ?? 3000}/api/exit-brief/pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error ?? "Failed to send PDF");
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
