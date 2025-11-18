import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Department router
  departments: router({
    list: protectedProcedure.query(async () => {
      const { getAllDepartments } = await import("./db");
      return await getAllDepartments();
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string(), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createDepartment } = await import("./db");
        return await createDepartment(input);
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string(), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateDepartment } = await import("./db");
        return await updateDepartment(input);
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input: id, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteDepartment } = await import("./db");
        return await deleteDepartment(id);
      }),
  }),

  // Employee router
  employees: router({
    list: protectedProcedure.query(async () => {
      const { getAllEmployees } = await import("./db");
      return await getAllEmployees();
    }),
    byDepartment: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getEmployeesByDepartment } = await import("./db");
        return await getEmployeesByDepartment(input);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        departmentId: z.number(),
        email: z.string().optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createEmployee } = await import("./db");
        return await createEmployee(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        departmentId: z.number(),
        email: z.string().optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateEmployee } = await import("./db");
        return await updateEmployee(input);
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input: id, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteEmployee } = await import("./db");
        return await deleteEmployee(id);
      }),
  }),

  // File router
  files: router({
    list: protectedProcedure
      .input(z.object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(20),
        departmentId: z.number().optional(),
        employeeId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        keyword: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getFilesWithFilters } = await import("./db");
        return await getFilesWithFilters(input || {});
      }),
    byEmployee: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getFilesByEmployee } = await import("./db");
        return await getFilesByEmployee(input);
      }),
    search: protectedProcedure
      .input(z.string())
      .query(async ({ input }) => {
        const { searchFiles } = await import("./db");
        return await searchFiles(input);
      }),
    create: protectedProcedure
      .input(z.object({
        employeeId: z.number().nullable(),
        filename: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        uploadDate: z.date(),
        extractedText: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canUploadFiles")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createFile } = await import("./db");
        return await createFile({ ...input, uploadedBy: ctx.user.id });
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input: fileId, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canUploadFiles")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "無權限刪除檔案" });
        }
        const { deleteFile } = await import("./db");
        return await deleteFile(fileId);
      }),
    createFromText: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        fileName: z.string(),
        content: z.string(),
        fileUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canUploadFiles")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createFile } = await import("./db");
        return await createFile({
          employeeId: input.employeeId,
          filename: input.fileName,
          fileKey: `text-${Date.now()}`,
          fileUrl: input.fileUrl || "",
          mimeType: "text/plain",
          fileSize: new Blob([input.content]).size,
          uploadDate: new Date(),
          extractedText: input.content,
          uploadedBy: ctx.user.id,
        });
      }),
    logRead: protectedProcedure
      .input(z.number())
      .mutation(async ({ input: fileId, ctx }) => {
        const { logFileRead } = await import("./db");
        await logFileRead(fileId, ctx.user.id);
        return { success: true };
      }),
    getWithReadInfo: protectedProcedure
      .input(z.number())
      .query(async ({ input: fileId, ctx }) => {
        const { getFileWithReadInfo } = await import("./db");
        return await getFileWithReadInfo(fileId, ctx.user.id);
      }),
  }),

  // Analysis router
  analysis: router({
    byFile: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getAnalysisByFileId } = await import("./db");
        return await getAnalysisByFileId(input);
      }),
    create: protectedProcedure
      .input(z.object({
        fileId: z.number(),
        analysisType: z.string().optional().default("comprehensive"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canAnalyze")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getFileById, createAnalysis } = await import("./db");
        const { invokeLLM } = await import("./_core/llm");
        
        const file = await getFileById(input.fileId);
        if (!file) {
          throw new TRPCError({ code: "NOT_FOUND", message: "檔案不存在" });
        }
        
        // 使用結構化輸出生成AI分析結果
        const response = await invokeLLM({
          messages: [
            { 
              role: "system", 
              content: "你是一個專業的學習題庫分析助手。你的任務是分析新人的考核檔案，提供全面的分析和建議。" 
            },
            { 
              role: "user", 
              content: `請分析以下考核檔案內容，提供：
1. 整體摘要
2. 難度評估（簡單/中等/困難，並給出0-100分的分數和評估理由）
3. 答題表現分析（優勢、弱點、具體建議）
4. 需要加強的知識點（包含重要性和學習建議）
5. 推薦相關考題（標題、推薦理由、難度）

檔案內容：
${file.extractedText || "無法提取文字內容"}` 
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "exam_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "整體摘要" },
                  difficulty: {
                    type: "object",
                    properties: {
                      level: { type: "string", enum: ["簡單", "中等", "困難"], description: "難度等級" },
                      score: { type: "integer", description: "難度分數 (0-100)" },
                      reasoning: { type: "string", description: "評估理由" }
                    },
                    required: ["level", "score", "reasoning"],
                    additionalProperties: false
                  },
                  performance: {
                    type: "object",
                    properties: {
                      strengths: { type: "array", items: { type: "string" }, description: "優勢項目" },
                      weaknesses: { type: "array", items: { type: "string" }, description: "弱點項目" },
                      suggestions: { type: "array", items: { type: "string" }, description: "改進建議" }
                    },
                    required: ["strengths", "weaknesses", "suggestions"],
                    additionalProperties: false
                  },
                  knowledgeGaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string", description: "知識點名稱" },
                        importance: { type: "string", enum: ["high", "medium", "low"], description: "重要性" },
                        recommendation: { type: "string", description: "學習建議" }
                      },
                      required: ["topic", "importance", "recommendation"],
                      additionalProperties: false
                    },
                    description: "需要加強的知識點"
                  },
                  recommendedQuestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "考題標題" },
                        reason: { type: "string", description: "推薦理由" },
                        difficulty: { type: "string", enum: ["簡單", "中等", "困難"], description: "難度" }
                      },
                      required: ["title", "reason", "difficulty"],
                      additionalProperties: false
                    },
                    description: "推薦考題"
                  }
                },
                required: ["summary", "difficulty", "performance", "knowledgeGaps", "recommendedQuestions"],
                additionalProperties: false
              }
            }
          }
        });
        
        const messageContent = response.choices[0].message.content;
        const result = typeof messageContent === "string" ? messageContent : JSON.stringify(messageContent);
        
        await createAnalysis({
          fileId: input.fileId,
          analysisType: input.analysisType,
          result: result || "",
          createdBy: ctx.user.id,
        });
        
        return { result: JSON.parse(result) };
      }),
  }),

  // User management router
  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllUsers } = await import("./db");
      return await getAllUsers();
    }),
    updateRole: protectedProcedure
      .input(z.object({ openId: z.string(), role: z.enum(["admin", "editor", "viewer", "pending"]) }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateUserRole } = await import("./db");
        await updateUserRole(input.openId, input.role);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.string())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteUser } = await import("./db");
        await deleteUser(input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
