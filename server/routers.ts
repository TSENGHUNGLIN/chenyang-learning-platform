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
    getAssessmentRecords: protectedProcedure
      .input(z.number())
      .query(async ({ input: employeeId }) => {
        const { getAssessmentRecordsByEmployee } = await import("./db");
        return await getAssessmentRecordsByEmployee(employeeId);
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
    exportPDF: protectedProcedure
      .input(z.object({
        result: z.any(),
        fileNames: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { exportAnalysisToPDF } = await import("./exportAnalysis");
        const pdfPath = await exportAnalysisToPDF(input.result, input.fileNames);
        // 讀取PDF檔案內容
        const fs = await import("fs/promises");
        const pdfBuffer = await fs.readFile(pdfPath);
        // 轉換為base64
        const base64 = pdfBuffer.toString("base64");
        // 刪除臨時檔案
        await fs.unlink(pdfPath);
        return { base64, filename: `analysis-report-${Date.now()}.pdf` };
      }),
    customAnalysis: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
        analysisType: z.enum(["generate_questions", "analyze_questions", "other"]),
        analysisMode: z.enum(["file_only", "external", "mixed"]).default("file_only"),
        customPrompt: z.string(),
        questionSource: z.string().optional(), // 新增考題出處
        useCache: z.boolean().default(true), // 是否使用快取
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canAnalyze")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getFileById, getAnalysisHistoryByHash, createAnalysisHistory } = await import("./db");
        const { invokeLLM } = await import("./_core/llm");
        const { invokeLLMWithRetry, parseLLMResponse } = await import("./aiAnalysisHelper");
        const { calculateAnalysisHash, findCachedAnalysis } = await import("./analysisCacheHelper");
        
        // 計算快取hash
        const resultHash = calculateAnalysisHash({
          fileIds: input.fileIds,
          analysisType: input.analysisType,
          analysisMode: input.analysisMode,
          customPrompt: input.customPrompt,
        });
        
        // 如果啟用快取，先查找快取結果
        if (input.useCache) {
          const cachedResult = await findCachedAnalysis(resultHash, getAnalysisHistoryByHash);
          if (cachedResult) {
            console.log(`[快取] 返回快取結果，ID: ${cachedResult.id}`);
            return {
              result: typeof cachedResult.result === 'string' ? JSON.parse(cachedResult.result) : cachedResult.result,
              fromCache: true,
              cacheId: cachedResult.id,
            };
          }
        }
        
        // 獲取所有選擇的檔案
        const files = await Promise.all(
          input.fileIds.map(id => getFileById(id))
        );
        const validFiles = files.filter(f => f !== null);
        
        if (validFiles.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "檔案不存在" });
        }
        
        // 根據分析模式生成不同的指示
        let modeInstruction = "";
        if (input.analysisMode === "file_only") {
          modeInstruction = "\n\n**重要：你必須只使用提供的檔案內容進行分析，不得引用任何外部知識或資訊。所有的分析結果、題目和答案都必須基於檔案內容。**";
        } else if (input.analysisMode === "external") {
          modeInstruction = "\n\n你可以引用外部知識和資訊來補充分析，但請明確標註哪些內容來自外部資源。";
        } else {
          modeInstruction = "\n\n你可以結合檔案內容和外部知識進行綜合分析，但請以檔案內容為主。";
        }
        
        // 根據分析類型生成不同的系統提示
        let systemPrompt = "";
        let userPrompt = "";
        
        const fileContents = validFiles.map(f => `檔案：${f!.filename}\n${f!.extractedText || "無法提取文字內容"}`).join("\n\n");
        
        if (input.analysisType === "generate_questions") {
          // 從題庫獲取所有題目，並載入分類和標籤資訊
          const { getAllQuestions, getAllCategories, getAllTags, getQuestionTags } = await import("./db");
          const allQuestions = await getAllQuestions();
          const categories = await getAllCategories();
          const tags = await getAllTags();
          
          // 為每個題目載入標籤
          const questionsWithTags = await Promise.all(
            allQuestions.map(async (q: any) => {
              const questionTags = await getQuestionTags(q.id);
              return { ...q, tags: questionTags };
            })
          );
          
          // 建立分類和標籤的對照表
          const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));
          const tagMap = new Map(tags.map((t: any) => [t.id, t.name]));
          
          // 將題庫資訊轉換為文字格式，包含分類和標籤
          const questionBankInfo = questionsWithTags.length > 0 
            ? `\n\n可用題庫（共 ${questionsWithTags.length} 題）：\n${questionsWithTags.map((q: any, idx: number) => {
                const categoryName = q.categoryId ? categoryMap.get(q.categoryId) : '無分類';
                const tagNames = q.tags.map((t: any) => t.name).join(', ') || '無標籤';
                return `${idx + 1}. [類型: ${q.type === 'true_false' ? '是非題' : q.type === 'multiple_choice' ? '選擇題' : '問答題'}, 難度: ${q.difficulty === 'easy' ? '簡單' : q.difficulty === 'medium' ? '中等' : '困難'}, 分類: ${categoryName}, 標籤: ${tagNames}] ${q.question}`;
              }).join('\n')}`
            : "";
          
          systemPrompt = `你是一個專業的考題出題助手。你的任務是根據檔案內容、使用者的要求和題庫中的題目，智能選擇或生成適合的考題。優先從題庫中選擇相關題目（根據分類和標籤篩選），如果題庫中沒有適合的題目，再根據檔案內容生成新題目。請先提供「題目整理」（僅列出題目，不含答案），再提供「題目與答案」（每個題目搭配完整答案）。${modeInstruction}`;
          userPrompt = `請根據以下檔案內容和題庫，${input.customPrompt}${questionBankInfo}\n\n檔案內容：\n${fileContents}`;
        } else if (input.analysisType === "analyze_questions") {
          systemPrompt = `你是一個專業的學習題庫分析助手。你的任務是分析考核檔案，提供全面的分析和建議。${modeInstruction}`;
          userPrompt = `請${input.customPrompt}\n\n檔案內容：\n${fileContents}`;
        } else {
          systemPrompt = `你是一個專業的AI助手，擅長分析和處理各種文檔內容。${modeInstruction}`;
          userPrompt = `${input.customPrompt}\n\n檔案內容：\n${fileContents}`;
        }
        
        // 根據分析類型決定返回格式
        if (input.analysisType === "generate_questions" || input.analysisType === "analyze_questions") {
          // 使用結構化輸出（JSON Schema）
          const response = await invokeLLMWithRetry(invokeLLM, {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "analysis_result",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "整體摘要" },
                    difficulty: {
                      type: "object",
                      properties: {
                        level: { type: "string", enum: ["簡單", "中等", "困難"], description: "難度等級" },
                        score: { type: "number", description: "難度分數（0-100）" },
                        reasoning: { type: "string", description: "難度評估理由" },
                      },
                      required: ["level", "score", "reasoning"],
                      additionalProperties: false,
                    },
                    performance: {
                      type: "object",
                      properties: {
                        strengths: { type: "array", items: { type: "string" }, description: "優勢" },
                        weaknesses: { type: "array", items: { type: "string" }, description: "弱點" },
                        suggestions: { type: "array", items: { type: "string" }, description: "改進建議" },
                      },
                      required: ["strengths", "weaknesses", "suggestions"],
                      additionalProperties: false,
                    },
                    knowledgeGaps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          topic: { type: "string", description: "知識點" },
                          importance: { type: "string", enum: ["high", "medium", "low"], description: "重要性" },
                          recommendation: { type: "string", description: "建議" },
                        },
                        required: ["topic", "importance", "recommendation"],
                        additionalProperties: false,
                      },
                      description: "知識缺口",
                    },
                    recommendedQuestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "考題標題" },
                          reason: { type: "string", description: "推薦理由" },
                          difficulty: { type: "string", enum: ["簡單", "中等", "困難"], description: "難度" },
                        },
                        required: ["title", "reason", "difficulty"],
                        additionalProperties: false,
                      },
                      description: "推薦考題",
                    },
                    questionsOnly: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          number: { type: "number", description: "題號" },
                          question: { type: "string", description: "題目" },
                          type: { type: "string", enum: ["是非題", "選擇題", "問答題"], description: "題型" },
                          options: { type: "array", items: { type: "string" }, description: "選項（僅選擇題）" },
                        },
                        required: ["number", "question", "type"],
                        additionalProperties: false,
                      },
                      description: "題目整理（不含答案）",
                    },
                    questionsWithAnswers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          number: { type: "number", description: "題號" },
                          question: { type: "string", description: "題目" },
                          type: { type: "string", enum: ["是非題", "選擇題", "問答題"], description: "題型" },
                          options: { type: "array", items: { type: "string" }, description: "選項（僅選擇題）" },
                          answer: { type: "string", description: "答案" },
                          explanation: { type: "string", description: "解釋" },
                        },
                        required: ["number", "question", "type", "answer"],
                        additionalProperties: false,
                      },
                      description: "題目與答案",
                    },
                  },
                  required: ["summary", "difficulty", "performance", "knowledgeGaps", "recommendedQuestions", "questionsOnly", "questionsWithAnswers"],
                  additionalProperties: false,
                },
              },
            },
          });
          
          const result = parseLLMResponse(response);
          
          // 儲存考核記錄（如果有employeeId）
          if (input.fileIds && input.fileIds.length > 0) {
            const { getEmployeeIdByFileId, createAssessmentRecord } = await import("./db");
            const employeeId = await getEmployeeIdByFileId(input.fileIds[0]);
            if (employeeId) {
              await createAssessmentRecord({
                employeeId,
                analysisType: input.analysisType,
                score: result.difficulty?.score,
                result: JSON.stringify(result),
                fileIds: input.fileIds,
                createdBy: ctx.user.id,
              });
            }
          }
          
          // 儲存AI分析歷史記錄
          const { createAnalysisHistory, getFileById } = await import("./db");
          const fileNames = await Promise.all(
            input.fileIds.map(async (id) => {
              const file = await getFileById(id);
              return file?.filename || '未知檔案';
            })
          );
          await createAnalysisHistory({
            analysisType: input.analysisType,
            analysisMode: input.analysisMode,
            prompt: input.customPrompt,
            fileIds: input.fileIds,
            fileNames,
            result: JSON.stringify(result),
            resultHash,
            createdBy: ctx.user.id,
          });
          
          return { result, fromCache: false };
        } else {
          // 其他類型返回純文字
          const response = await invokeLLMWithRetry(invokeLLM, {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          });
          
          const result = response.choices[0].message.content || "無法生成分析結果";
          
          // 儲存考核記錄（如果有employeeId）
          if (input.fileIds && input.fileIds.length > 0) {
            const { getEmployeeIdByFileId, createAssessmentRecord } = await import("./db");
            const employeeId = await getEmployeeIdByFileId(input.fileIds[0]);
            if (employeeId) {
              await createAssessmentRecord({
                employeeId,
                analysisType: input.analysisType,
                result: typeof result === 'string' ? result : JSON.stringify(result),
                fileIds: input.fileIds,
                createdBy: ctx.user.id,
              });
            }
          }
          
          // 儲存AI分析歷史記錄
          const { createAnalysisHistory, getFileById } = await import("./db");
          const fileNames = await Promise.all(
            input.fileIds.map(async (id) => {
              const file = await getFileById(id);
              return file?.filename || '未知檔案';
            })
          );
          await createAnalysisHistory({
            analysisType: input.analysisType,
            analysisMode: input.analysisMode,
            prompt: input.customPrompt,
            fileIds: input.fileIds,
            fileNames,
            result: typeof result === 'string' ? result : JSON.stringify(result),
            resultHash,
            createdBy: ctx.user.id,
          });
          
          return { result, fromCache: false };
        }
      }),
    // AI分析歷史記錄相關API
    historyList: protectedProcedure.query(async () => {
      const { getAllAnalysisHistory } = await import("./db");
      return await getAllAnalysisHistory();
    }),
    historyById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getAnalysisHistoryById } = await import("./db");
        return await getAnalysisHistoryById(input);
      }),
    rateAnalysis: protectedProcedure
      .input(z.object({
        id: z.number(),
        qualityScore: z.number().min(-1).max(1), // 1=好，-1=壞
        userFeedback: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateAnalysisQuality } = await import("./db");
        await updateAnalysisQuality(input.id, input.qualityScore, input.userFeedback);
        return { success: true };
      }),
    deleteHistory: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteAnalysisHistory } = await import("./db");
        await deleteAnalysisHistory(input);
        return { success: true };
      }),
    exportWord: protectedProcedure
      .input(z.object({
        result: z.any(),
        fileNames: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { exportAnalysisToWord } = await import("./exportAnalysis");
        const docPath = await exportAnalysisToWord(input.result, input.fileNames);
        // 讀取檔案內容
        const fs = await import("fs/promises");
        const docBuffer = await fs.readFile(docPath);
        // 轉換為base64
        const base64 = docBuffer.toString("base64");
        // 刪除臨時檔案
        await fs.unlink(docPath);
        const ext = docPath.endsWith(".docx") ? "docx" : "md";
        return { base64, filename: `analysis-report-${Date.now()}.${ext}` };
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
      .input(z.object({ openId: z.string(), role: z.enum(["admin", "editor", "viewer", "examinee"]) }))
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

  // Question bank management router
  questions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllQuestions } = await import("./db");
      return await getAllQuestions();
    }),
    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getQuestionById } = await import("./db");
        return await getQuestionById(input);
      }),
    create: protectedProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        type: z.enum(["true_false", "multiple_choice", "short_answer"]),
        difficulty: z.enum(["easy", "medium", "hard"]),
        question: z.string(),
        options: z.string().optional(),
        correctAnswer: z.string(),
        explanation: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createQuestion } = await import("./db");
        await createQuestion({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        type: z.enum(["true_false", "multiple_choice", "short_answer"]).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        question: z.string().optional(),
        options: z.string().optional(),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateQuestion } = await import("./db");
        const { id, ...data } = input;
        await updateQuestion(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteQuestion } = await import("./db");
        await deleteQuestion(input);
        return { success: true };
      }),
    batchImport: protectedProcedure
      .input(z.array(z.object({
        categoryId: z.number().optional(),
        type: z.enum(["true_false", "multiple_choice", "short_answer"]),
        difficulty: z.enum(["easy", "medium", "hard"]),
        question: z.string(),
        options: z.string().optional(),
        correctAnswer: z.string(),
        explanation: z.string().optional(),
        tagIds: z.array(z.number()).optional(),
        source: z.string().optional(), // 新增考題出處
      })))
      .mutation(async ({ input, ctx }) => {
        console.log('[batchImport API] 收到的 input:', JSON.stringify(input, null, 2));
        console.log('[batchImport API] input 的類型:', typeof input);
        console.log('[batchImport API] input 是否為陣列:', Array.isArray(input));
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createQuestion } = await import("./db");
        const { setQuestionTags } = await import("./db");
        
        const results = {
          success: 0,
          failed: 0,
          errors: [] as string[],
          questionIds: [] as number[],
        };

        for (let i = 0; i < input.length; i++) {
          try {
            const question = input[i];
            const result = await createQuestion({ 
              ...question, 
              createdBy: ctx.user.id 
            });
            
            // Extract question ID
            const insertResult = result as any;
            const questionId = insertResult.insertId || insertResult[0]?.insertId;
            
            if (questionId) {
              results.questionIds.push(questionId);
              
              // Set tags if provided
              if (question.tagIds && question.tagIds.length > 0) {
                await setQuestionTags(questionId, question.tagIds);
              }
            }
            
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push(`第 ${i + 1} 項：${error instanceof Error ? error.message : '未知錯誤'}`);
          }
        }

        return results;
      }),
  }),

  // Question categories router
  questionCategories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllCategories } = await import("./db");
      return await getAllCategories();
    }),
    tree: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getCategoryTree } = await import("./db");
      return await getCategoryTree();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        parentId: z.number().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createCategory } = await import("./db");
        await createCategory(input);
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        parentId: z.number().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateCategory } = await import("./db");
        const { id, ...data } = input;
        await updateCategory(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteCategory } = await import("./db");
        await deleteCategory(input);
        return { success: true };
      }),
  }),

  // Tags router
  tags: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllTags } = await import("./db");
      return await getAllTags();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createTag } = await import("./db");
        await createTag(input);
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateTag } = await import("./db");
        const { id, ...data } = input;
        await updateTag(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteTag } = await import("./db");
        await deleteTag(input);
        return { success: true };
      }),
  }),

  // Question tags association router
  questionTags: router({
    getByQuestion: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getQuestionTags } = await import("./db");
        return await getQuestionTags(input);
      }),
    setTags: protectedProcedure
      .input(z.object({
        questionId: z.number(),
        tagIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { setQuestionTags } = await import("./db");
        await setQuestionTags(input.questionId, input.tagIds);
        return { success: true };
      }),
  }),

  // Exam management router
  exams: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllExams } = await import("./db");
      return await getAllExams();
    }),
    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getExamById } = await import("./db");
        return await getExamById(input);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        timeLimit: z.number().optional(),
        passingScore: z.number(),
        totalScore: z.number().optional().default(100),
        gradingMethod: z.enum(["auto", "manual", "mixed"]).optional().default("auto"),
        status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createExam } = await import("./db");
        return await createExam({
          ...input,
          totalScore: input.totalScore || 100,
          gradingMethod: input.gradingMethod || "auto",
          status: input.status || "draft",
          createdBy: ctx.user.id,
        });
      }),
    // 從題庫建立考卷（快速建立）
    createFromBank: protectedProcedure
      .input(z.object({
        bankId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        timeLimit: z.number().optional(),
        passingScore: z.number().optional().default(60),
        pointsPerQuestion: z.number().optional().default(1),
        status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        
        const { getQuestionBankById } = await import("./questionBanks");
        const { getQuestionBankQuestions } = await import("./questionBanks");
        const bank = await getQuestionBankById(input.bankId);
        if (!bank) {
          throw new TRPCError({ code: "NOT_FOUND", message: "找不到題庫檔案" });
        }
        
        const questions = await getQuestionBankQuestions(input.bankId);
        if (!questions || questions.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "題庫中沒有題目" });
        }
        
        const totalScore = questions.length * (input.pointsPerQuestion || 1);
        
        const { createExam } = await import("./db");
        const exam = await createExam({
          title: input.title || `${bank.name} - 考卷`,
          description: input.description || bank.description || `從「${bank.name}」題庫建立的考卷`,
          timeLimit: input.timeLimit,
          passingScore: input.passingScore || 60,
          totalScore,
          gradingMethod: "auto",
          status: input.status || "draft",
          createdBy: ctx.user.id,
        });
        
        const { batchAddExamQuestions } = await import("./db");
        const examQuestions = questions.map((q: any, index: number) => ({
          questionId: q.id,
          questionOrder: index + 1,
          points: input.pointsPerQuestion || 1,
        }));
        await batchAddExamQuestions(exam.id, examQuestions);
        
        return {
          success: true,
          examId: exam.id,
          questionCount: questions.length,
          totalScore,
        };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        timeLimit: z.number().optional(),
        passingScore: z.number().optional(),
        totalScore: z.number().optional(),
        gradingMethod: z.enum(["auto", "manual", "mixed"]).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateExam } = await import("./db");
        const { id, ...data } = input;
        await updateExam(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteExam } = await import("./db");
        await deleteExam(input);
        return { success: true };
      }),
    addQuestion: protectedProcedure
      .input(z.object({
        examId: z.number(),
        questionId: z.number(),
        questionOrder: z.number(),
        points: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { addExamQuestion } = await import("./db");
        await addExamQuestion(input);
        return { success: true };
      }),
    batchAddQuestions: protectedProcedure
      .input(z.object({
        examId: z.number(),
        questions: z.array(z.object({
          questionId: z.number(),
          questionOrder: z.number(),
          points: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { batchAddExamQuestions } = await import("./db");
        await batchAddExamQuestions(input.examId, input.questions);
        return { success: true, count: input.questions.length };
      }),
    // 簡化版的批次新增題目 API，自動設定順序和分數
    batchAddExamQuestions: protectedProcedure
      .input(z.object({
        examId: z.number(),
        questionIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { batchAddExamQuestions } = await import("./db");
        // 自動設定題目順序和分數（每題1分）
        const questions = input.questionIds.map((questionId, index) => ({
          questionId,
          questionOrder: index + 1,
          points: 1,
        }));
        await batchAddExamQuestions(input.examId, questions);
        return { success: true, count: questions.length };
      }),
    getQuestions: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getExamQuestions } = await import("./db");
        return await getExamQuestions(input);
      }),
    deleteQuestion: protectedProcedure
      .input(z.object({
        examId: z.number(),
        questionId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteExamQuestion } = await import("./db");
        await deleteExamQuestion(input.examId, input.questionId);
        return { success: true };
      }),
    assign: protectedProcedure
      .input(z.object({
        examId: z.number(),
        userId: z.number(),
        employeeId: z.number().optional(),
        deadline: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { assignExam } = await import("./db");
        await assignExam(input);
        return { success: true };
      }),
    batchAssign: protectedProcedure
      .input(z.object({
        examId: z.number(),
        userIds: z.array(z.number()),
        deadline: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { batchAssignExam } = await import("./db");
        const result = await batchAssignExam(input);
        return result;
      }),
    getAssignments: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getExamAssignments } = await import("./db");
        return await getExamAssignments(input);
      }),
    myAssignments: protectedProcedure.query(async ({ ctx }) => {
      const { getUserExamAssignments } = await import("./db");
      return await getUserExamAssignments(ctx.user.id);
    }),
    // 考試作答相關API
    getForTaking: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { getExamForTaking } = await import("./db");
        return await getExamForTaking(input, ctx.user.id);
      }),
    start: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const { startExam } = await import("./db");
        return await startExam(input);
      }),
    saveAnswer: protectedProcedure
      .input(z.object({
        assignmentId: z.number(),
        questionId: z.number(),
        answer: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { saveAnswer } = await import("./db");
        return await saveAnswer(input);
      }),
    getSubmissions: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getExamSubmissions } = await import("./db");
        return await getExamSubmissions(input);
      }),
    submit: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const { submitExam } = await import("./db");
        return await submitExam(input);
      }),
    getScore: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getExamScore } = await import("./db");
        return await getExamScore(input);
      }),
    // 統計API
    getStatistics: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getExamStatistics } = await import("./examStatistics");
        return await getExamStatistics(input);
      }),
    getWrongAnswerRanking: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getWrongAnswerRanking } = await import("./examStatistics");
        return await getWrongAnswerRanking(input);
      }),
    getStudentPerformance: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getStudentPerformance } = await import("./examStatistics");
        return await getStudentPerformance(input);
      }),
    getAllStatistics: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllExamsStatistics } = await import("./examStatistics");
      return await getAllExamsStatistics();
    }),
    // 人工評分API
    updateManualScore: protectedProcedure
      .input(
        z.object({
          submissionId: z.number(),
          score: z.number(),
          teacherComment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateManualScore, recalculateExamScore } = await import("./manualGrading");
        
        // 更新分數
        await updateManualScore(input);
        
        // 取得assignmentId並重新計算總分
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { examSubmissions } = await import("../drizzle/schema");
        const submission = await db
          .select()
          .from(examSubmissions)
          .where(eq(examSubmissions.id, input.submissionId))
          .limit(1);
        
        if (submission.length > 0) {
          await recalculateExamScore(submission[0].assignmentId);
        }
        
        return { success: true };
      }),
    // 成績匯出API
    exportScores: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { exportExamScoresToExcel } = await import("./examExport");
        const result = await exportExamScoresToExcel(input);
        
        // 返回base64編碼的檔案內容
        return {
          data: result.buffer.toString("base64"),
          filename: result.filename,
        };
      }),
    exportStatistics: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { exportExamStatisticsToExcel } = await import("./examExport");
        const result = await exportExamStatisticsToExcel(input);
        
        // 返回base64編碼的檔案內容
        return {
          data: result.buffer.toString("base64"),
          filename: result.filename,
        };
      }),
  }),

  // Question banks router
  questionBanks: router({
    checkNameExists: protectedProcedure
      .input(z.string())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) {
          return { exists: false };
        }
        const { questionBanks } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db
          .select()
          .from(questionBanks)
          .where(eq(questionBanks.name, input))
          .limit(1);
        return { exists: result.length > 0 };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllQuestionBanks } = await import("./questionBanks");
      return await getAllQuestionBanks();
    }),
    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getQuestionBankById } = await import("./questionBanks");
        return await getQuestionBankById(input);
      }),
    getQuestions: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getQuestionBankQuestions } = await import("./questionBanks");
        return await getQuestionBankQuestions(input);
      }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createQuestionBank } = await import("./questionBanks");
        return await createQuestionBank({
          ...input,
          createdBy: ctx.user.id,
        });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateQuestionBank } = await import("./questionBanks");
        const { id, ...data } = input;
        return await updateQuestionBank(id, data);
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteQuestionBank } = await import("./questionBanks");
        return await deleteQuestionBank(input);
      }),
    addQuestion: protectedProcedure
      .input(
        z.object({
          bankId: z.number(),
          questionId: z.number(),
          order: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { addQuestionToBank } = await import("./questionBanks");
        return await addQuestionToBank(input.bankId, input.questionId, input.order);
      }),
    batchAddQuestions: protectedProcedure
      .input(
        z.object({
          bankId: z.number(),
          questionIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { batchAddQuestionsToBank } = await import("./questionBanks");
        return await batchAddQuestionsToBank(input.bankId, input.questionIds);
      }),
    // Alias for batchAddQuestions (for backward compatibility)
    addQuestions: protectedProcedure
      .input(
        z.object({
          bankId: z.number(),
          questionIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { batchAddQuestionsToBank } = await import("./questionBanks");
        return await batchAddQuestionsToBank(input.bankId, input.questionIds);
      }),
    removeQuestion: protectedProcedure
      .input(
        z.object({
          bankId: z.number(),
          questionId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { removeQuestionFromBank } = await import("./questionBanks");
        return await removeQuestionFromBank(input.bankId, input.questionId);
      }),
    createWithQuestions: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          questions: z.array(
            z.object({
              categoryId: z.number().optional(),
              type: z.enum(["true_false", "multiple_choice", "short_answer"]),
              difficulty: z.enum(["easy", "medium", "hard"]),
              question: z.string(),
              options: z.string().optional(),
              correctAnswer: z.string(),
              explanation: z.string().optional(),
              tagIds: z.array(z.number()).optional(),
              source: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }

        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
        }

        // 1. 建立題庫檔案
        const { createQuestionBank } = await import("./questionBanks");
        const bank = await createQuestionBank({
          name: input.name,
          description: input.description,
          createdBy: ctx.user.id,
        });

        // 2. 批次建立題目
        const { questions: questionsTable } = await import("../drizzle/schema");
        const questionIds: number[] = [];
        const results = { success: 0, failed: 0, errors: [] as string[] };

        for (const q of input.questions) {
          try {
            await db.insert(questionsTable).values({
              categoryId: q.categoryId,
              type: q.type,
              difficulty: q.difficulty,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              source: q.source,
              createdBy: ctx.user.id,
            });
            
            // 查詢新建立的題目記錄
            const { eq, desc } = await import("drizzle-orm");
            const newQuestion = await db
              .select()
              .from(questionsTable)
              .where(eq(questionsTable.question, q.question))
              .orderBy(desc(questionsTable.id))
              .limit(1);
            
            if (newQuestion.length > 0 && newQuestion[0].id) {
              questionIds.push(newQuestion[0].id);
              results.success++;
            } else {
              results.failed++;
              results.errors.push(`題目建立失敗: 無法獲取題目 ID`);
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`題目建立失敗: ${error}`);
          }
        }

        // 3. 將題目加入題庫
        if (questionIds.length > 0) {
          const { batchAddQuestionsToBank } = await import("./questionBanks");
          await batchAddQuestionsToBank(bank.id, questionIds);
        }

        return {
          bankId: bank.id,
          bankName: bank.name,
          questionIds,
          results,
        };
      }),
    generateName: protectedProcedure
      .input(
        z.object({
          questions: z.array(
            z.object({
              type: z.string(),
              question: z.string(),
              correctAnswer: z.string().optional(),
              answer: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.log('[generateName API] 收到的input:', JSON.stringify(input, null, 2));
        console.log('[generateName API] input的類型:', typeof input);
        console.log('[generateName API] input是否為陣列:', Array.isArray(input));
        console.log('[generateName API] input.questions:', input.questions);
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        
        // 直接使用傳入的題目資料
        const questionData = input.questions.map(q => ({
          type: q.type,
          question: q.question,
          correctAnswer: q.correctAnswer || q.answer || '',
        }));
        
        // 使用AI生成名稱
        const { generateQuestionBankName } = await import("./questionBankNaming");
        const name = await generateQuestionBankName(questionData);
        
        return { name };
      }),
  }),
});

export type AppRouter = typeof appRouter;
