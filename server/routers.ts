import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,

  // 考試提醒系統
  examReminders: router({
    trigger: protectedProcedure.mutation(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { triggerReminderCheck } = await import("./examReminderTask");
      return await triggerReminderCheck();
    }),
  }),

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
    parseCSV: protectedProcedure
      .input(z.object({
        csvContent: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        
        const iconv = await import('iconv-lite');
        const { getAllDepartments } = await import("./db");
        const departments = await getAllDepartments();
        
        // 嘗試多種編碼解碼
        let text = input.csvContent;
        
        // 如果是Base64編碼，先解碼
        if (input.csvContent.startsWith('data:')) {
          const base64Data = input.csvContent.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // 先嘗試UTF-8編碼
          try {
            text = buffer.toString('utf-8');
            // 移除 UTF-8 BOM
            if (text.charCodeAt(0) === 0xFEFF) {
              text = text.substring(1);
            }
          } catch (e) {
            // 如果UTF-8失敗，嘗試BIG5
            text = iconv.default.decode(buffer, 'big5');
          }
        }
        
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "檔案格式不正確，至少需要標題行和一筆資料" 
          });
        }
        
        // 解析標題行
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().replace(/\s+/g, ''));
        
        // 找到部門、姓名、郵件欄位
        const deptIndex = headers.findIndex(h => h.includes('部門') || h === 'department');
        const nameIndex = headers.findIndex(h => h.includes('姓名') || h === 'name');
        const emailIndex = headers.findIndex(h => h.includes('MAIL') || h.includes('mail') || h.includes('郵件'));
        
        if (deptIndex === -1 || nameIndex === -1) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "檔案格式不正確，需要包含「部門」和「姓名」欄位" 
          });
        }
        
        // 解析資料
        const preview = lines.slice(1).map((line, index) => {
          const columns = line.split(',').map(s => s.trim());
          const departmentName = columns[deptIndex] || '';
          const name = columns[nameIndex] || '';
          const email = emailIndex !== -1 ? (columns[emailIndex] || null) : null;
          
          const department = departments.find(d => d.name === departmentName);
          return {
            index: index + 1,
            name,
            departmentName,
            departmentId: department?.id,
            email: email || null,
            valid: !!name && !!department
          };
        });
        
        return { preview };
      }),
    batchImport: protectedProcedure
      .input(z.object({
        employees: z.array(z.object({
          name: z.string(),
          departmentId: z.number(),
          email: z.string().nullable().optional(),
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { batchCreateEmployees } = await import("./db");
        return await batchCreateEmployees(input.employees);
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
    batchUpdateEmployee: protectedProcedure
      .input(z.object({
        fileIds: z.array(z.number()),
        employeeId: z.number().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canUploadFiles")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { batchUpdateFileEmployee } = await import("./db");
        return await batchUpdateFileEmployee(input.fileIds, input.employeeId);
      }),
    getWithReadInfo: protectedProcedure
      .input(z.number())
      .query(async ({ input: fileId, ctx }) => {
        const { getFileWithReadInfo } = await import("./db");
        return await getFileWithReadInfo(fileId, ctx.user.id);
      }),
    previewCSV: protectedProcedure
      .input(z.object({
        fileUrl: z.string(),
        maxRows: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        const { parseCSVForPreview } = await import("./csvPreview");
        
        // 從 S3 下載檔案
        const response = await fetch(input.fileUrl);
        if (!response.ok) {
          throw new TRPCError({ code: "NOT_FOUND", message: "檔案不存在" });
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        return await parseCSVForPreview(buffer, input.maxRows);
      }),
    validateCSV: protectedProcedure
      .input(z.object({
        fileUrl: z.string(),
        requiredHeaders: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        const { validateCSV } = await import("./csvPreview");
        
        // 從 S3 下載檔案
        const response = await fetch(input.fileUrl);
        if (!response.ok) {
          throw new TRPCError({ code: "NOT_FOUND", message: "檔案不存在" });
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        return await validateCSV(buffer, input.requiredHeaders);
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
          
          // 建立可用分類和標籤清單
          const categoryList = categories.map((c: any) => c.name).join('、');
          const tagList = tags.map((t: any) => `${t.name}(${t.category})`).join('、');
          
          systemPrompt = `你是一個專業的考題出題助手。你的任務是根據檔案內容、使用者的要求和題庫中的題目，智能選擇或生成適合的考題。優先從題庫中選擇相關題目（根據分類和標籤篩選），如果題庫中沒有適合的題目，再根據檔案內容生成新題目。

對於每個題目，請提供：
1. source：考題出處（檔案名稱、頁碼或段落）
2. suggestedCategory：建議的分類（從以下分類中選擇：${categoryList}）
3. suggestedTags：建議的標籤（從以下標籤中選擇，可多選：${tagList}）

請先提供「題目整理」（僅列出題目，不含答案），再提供「題目與答案」（每個題目搭配完整答案、出處和建議標籤）。${modeInstruction}`;
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
                          source: { type: "string", description: "考題出處（檔案名稱、頁碼等）" },
                          suggestedCategory: { type: "string", description: "AI建議的分類" },
                          suggestedTags: { type: "array", items: { type: "string" }, description: "AI建議的標籤" },
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
                          source: { type: "string", description: "考題出處（檔案名稱、頁碼等）" },
                          suggestedCategory: { type: "string", description: "AI建議的分類" },
                          suggestedTags: { type: "array", items: { type: "string" }, description: "AI建議的標籤" },
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
    updateName: protectedProcedure
      .input(z.object({ openId: z.string(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateUserName } = await import("./db");
        await updateUserName(input.openId, input.name);
        return { success: true };
      }),
    // 編輯者權限管理 API
    setDepartmentAccess: protectedProcedure
      .input(z.object({ editorId: z.number(), departmentIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { setEditorDepartmentAccess } = await import("./db");
        return await setEditorDepartmentAccess(input.editorId, input.departmentIds, ctx.user.id);
      }),
    setUserAccess: protectedProcedure
      .input(z.object({ editorId: z.number(), userIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { setEditorUserAccess } = await import("./db");
        return await setEditorUserAccess(input.editorId, input.userIds, ctx.user.id);
      }),
    getDepartmentAccess: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getEditorDepartmentAccess } = await import("./db");
        return await getEditorDepartmentAccess(input);
      }),
    getUserAccess: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getEditorUserAccess } = await import("./db");
        return await getEditorUserAccess(input);
      }),
    // 權限預覽 API
    previewAccess: protectedProcedure
      .input(z.object({
        departmentIds: z.array(z.number()),
        userIds: z.array(z.number()),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以管理權限" });
        }
        const { previewAccessibleExaminees } = await import("./permissionPreviewHelper");
        return await previewAccessibleExaminees(input.departmentIds, input.userIds);
      }),
  }),

  // Dashboard statistics and recent activities
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const { getDashboardStats } = await import("./db");
      return await getDashboardStats(ctx.user.role as any, ctx.user.id);
    }),
    recentActivities: protectedProcedure.query(async ({ ctx }) => {
      const { getRecentActivities } = await import("./db");
      return await getRecentActivities(ctx.user.role as any, ctx.user.id);
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
    applyAiSuggestions: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getQuestionById, updateQuestion } = await import("./db");
        const question = await getQuestionById(input);
        if (!question) {
          throw new TRPCError({ code: "NOT_FOUND", message: "題目不存在" });
        }
        
        // 採用AI建議：將suggestedCategoryId和suggestedTagIds複製到categoryId和tagIds
        const updates: any = {};
        if (question.suggestedCategoryId) {
          updates.categoryId = question.suggestedCategoryId;
        }
        
        await updateQuestion(input, updates);
        
        // 如果有建議標籤，也要更新questionTags表
        if (question.suggestedTagIds) {
          try {
            const tagIds = JSON.parse(question.suggestedTagIds);
            if (Array.isArray(tagIds) && tagIds.length > 0) {
              const { setQuestionTags } = await import("./db");
              await setQuestionTags(input, tagIds);
            }
          } catch (e) {
            console.error('解析AI建議標籤失敗:', e);
          }
        }
        
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { softDeleteQuestion } = await import("./db");
        await softDeleteQuestion(input, ctx.user.id);
        return { success: true };
      }),
    // 回收站相關 API
    listDeleted: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canEdit")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getDeletedQuestions } = await import("./db");
      return await getDeletedQuestions();
    }),
    restore: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { restoreQuestion } = await import("./db");
        await restoreQuestion(input);
        return { success: true };
      }),
    permanentDelete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { permanentDeleteQuestion } = await import("./db");
        await permanentDeleteQuestion(input);
        return { success: true };
      }),
    batchRestore: protectedProcedure
      .input(z.array(z.number()))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { restoreQuestion } = await import("./db");
        for (const id of input) {
          await restoreQuestion(id);
        }
        return { success: true };
      }),
    batchPermanentDelete: protectedProcedure
      .input(z.array(z.number()))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { permanentDeleteQuestion } = await import("./db");
        for (const id of input) {
          await permanentDeleteQuestion(id);
        }
        return { success: true };
      }),
    cleanupOldDeleted: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以執行此操作" });
        }
        const { cleanupOldDeletedQuestions } = await import("./db");
        const count = await cleanupOldDeletedQuestions();
        return { success: true, count };
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
        source: z.string().optional(), // 考題出處
        isAiGenerated: z.number().optional(), // 是否為AI生成（0=手動, 1=AI）
        suggestedCategoryId: z.number().optional(), // AI建議的分類ID
        suggestedTagIds: z.string().optional(), // AI建議的標籤ID（JSON格式）
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

        // 獲取所有標籤，找出AI生成標籤的ID
        const { getAllTags } = await import("./db");
        const allTags = await getAllTags();
        const aiGeneratedTag = allTags.find((t: any) => t.name === "AI生成" && t.category === "題目來源");
        
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
              
              // 處理標籤
              let finalTagIds = question.tagIds ? [...question.tagIds] : [];
              
              // 如果是AI生成的題目，自動加上AI生成標籤
              if (question.isAiGenerated === 1 && aiGeneratedTag && !finalTagIds.includes(aiGeneratedTag.id)) {
                finalTagIds.push(aiGeneratedTag.id);
              }
              
              // Set tags if provided
              if (finalTagIds.length > 0) {
                await setQuestionTags(questionId, finalTagIds);
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
    // 考試監控相關API
    listOngoing: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問考試監控" });
      }
      const { getOngoingExams } = await import("./examMonitoring");
      return await getOngoingExams();
    }),
    getMonitoringStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問考試監控" });
      }
      const { getMonitoringStats } = await import("./examMonitoring");
      return await getMonitoringStats();
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
        const exam = await createExam({
          ...input,
          totalScore: input.totalScore || 100,
          gradingMethod: input.gradingMethod || "auto",
          status: input.status || "draft",
          createdBy: ctx.user.id,
        });
        
        // 發送考試建立通知
        const { notifyExamCreated } = await import("./notificationHelper");
        await notifyExamCreated(exam.id, input.title, ctx.user.name || "未知用戶");
        
        return exam;
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
    // Alias for batchAddExamQuestions (for backward compatibility)
    addQuestions: protectedProcedure
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
    updateQuestion: protectedProcedure
      .input(z.object({
        examId: z.number(),
        questionId: z.number(),
        points: z.number().optional(),
        questionOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateExamQuestion } = await import("./db");
        await updateExamQuestion(input);
        return { success: true };
      }),
    reorderQuestions: protectedProcedure
      .input(z.object({
        examId: z.number(),
        questionOrders: z.array(z.object({
          questionId: z.number(),
          questionOrder: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { reorderExamQuestions } = await import("./db");
        await reorderExamQuestions(input.examId, input.questionOrders);
        return { success: true };
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
        // 驗證考試是否有題目
        const { getExamQuestions } = await import("./db");
        const questions = await getExamQuestions(input.examId);
        if (!questions || questions.length === 0) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "此考試尚未設定題目，無法指派考生。請先新增題目。" 
          });
        }
        const { assignExam } = await import("./db");
        const assignment = await assignExam(input);
        return assignment;
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
        // 驗證考試是否有題目
        const { getExamQuestions } = await import("./db");
        const questions = await getExamQuestions(input.examId);
        if (!questions || questions.length === 0) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "此考試尚未設定題目，無法批次指派考生。請先新增題目。" 
          });
        }
        const { batchAssignExam } = await import("./db");
        const result = await batchAssignExam(input);
        
        // 發送考試指派通知
        const { notifyExamAssigned } = await import("./notificationHelper");
        await notifyExamAssigned(input.examId, input.userIds);
        
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
    // 開始模擬練習（考生自行開始）
    startPractice: protectedProcedure
      .input(z.number()) // examId
      .mutation(async ({ input, ctx }) => {
        // 驗證考試是否存在且有題目
        const { getExamById, getExamQuestions } = await import("./db");
        const exam = await getExamById(input);
        if (!exam) {
          throw new TRPCError({ code: "NOT_FOUND", message: "找不到考試" });
        }
        
        const questions = await getExamQuestions(input);
        if (!questions || questions.length === 0) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "此考試尚未設定題目，無法開始模擬練習。" 
          });
        }
        
        // 建立模擬練習指派
        const { assignExam } = await import("./db");
        const assignment = await assignExam({
          examId: input,
          userId: ctx.user.id,
          isPractice: true, // 標記為模擬模式
        });
        
        return assignment;
      }),
    // 全域檢視（管理者/編輯者專用）
    allAssignments: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllExamAssignments } = await import("./db");
      return await getAllExamAssignments(ctx.user.id, ctx.user.role as string);
    }),
    getAssignment: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getExamAssignmentById } = await import("./db");
        return await getExamAssignmentById(input);
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
      .mutation(async ({ input, ctx }) => {
        const { submitExam } = await import("./db");
        const result = await submitExam(input);
        
        // 獲取examId和assignmentId
        const { getDb } = await import("./db");
        const db = await getDb();
        if (db) {
          const { examAssignments } = await import("../drizzle/schema");
          const assignment = await db
            .select()
            .from(examAssignments)
            .where(eq(examAssignments.id, input))
            .limit(1);
          
          if (assignment.length > 0) {
            // 發送成績公布通知
            const { notifyScorePublished } = await import("./notificationHelper");
            await notifyScorePublished(assignment[0].examId, input);
            
            // 收集錯題（只收集正式考試的錯題，模擬模式不收集）
            if (!assignment[0].isPractice) {
              const { collectWrongQuestions } = await import("./wrongQuestionBook");
              await collectWrongQuestions(input, ctx.user.id);
            }
          }
        }
        
        return result;
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
        
        // 返回back64編碼的檔案內容
        return {
          data: result.buffer.toString("base64"),
          filename: result.filename,
        };
      }),
    // 成績分析API
    getAnalytics: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getExamAnalytics } = await import("./examAnalytics");
        return await getExamAnalytics(input);
      }),
    getStudentRankings: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getStudentRankings } = await import("./examAnalytics");
        return await getStudentRankings(input);
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
        const { eq, desc } = await import("drizzle-orm");
        const questionIds: number[] = [];
        const results = { success: 0, failed: 0, errors: [] as string[] };

        for (const q of input.questions) {
          try {
            console.log('[createWithQuestions] 正在插入題目:', q);
            
            // 過濾掉 undefined 的欄位
            const values: any = {
              type: q.type,
              difficulty: q.difficulty,
              question: q.question,
              correctAnswer: q.correctAnswer,
              createdBy: ctx.user.id,
            };
            
            if (q.categoryId !== undefined) values.categoryId = q.categoryId;
            if (q.options !== undefined) values.options = q.options;
            if (q.explanation !== undefined) values.explanation = q.explanation;
            if (q.source !== undefined) values.source = q.source;
            
            console.log('[createWithQuestions] 準備插入的值:', values);
            console.log('[createWithQuestions] 值的類型:', {
              type: typeof values.type,
              difficulty: typeof values.difficulty,
              question: typeof values.question,
              correctAnswer: typeof values.correctAnswer,
              createdBy: typeof values.createdBy,
              options: typeof values.options,
              explanation: typeof values.explanation,
              source: typeof values.source,
            });
            
            // 確保所有必填欄位都有值
            if (!values.type || !values.difficulty || !values.question || !values.correctAnswer || !values.createdBy) {
              throw new Error(`必填欄位缺失: type=${values.type}, difficulty=${values.difficulty}, question=${values.question}, correctAnswer=${values.correctAnswer}, createdBy=${values.createdBy}`);
            }
            
            await db.insert(questionsTable).values(values);
            
            // 查詢新建立的題目記錄
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
          } catch (error: any) {
            console.error('[createWithQuestions] 題目建立失敗:', error);
            console.error('[createWithQuestions] 失敗的題目資料:', q);
            results.failed++;
            const errorMsg = error?.message || error?.toString() || '未知錯誤';
            results.errors.push(`題目建立失敗: ${errorMsg}`);
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

  // Exam Templates router
  examTemplates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canViewAll")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getAllExamTemplates } = await import("./db");
      return await getAllExamTemplates();
    }),
    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getExamTemplateById } = await import("./db");
        return await getExamTemplateById(input);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        timeLimit: z.number().optional(),
        passingScore: z.number(),
        gradingMethod: z.enum(["auto", "manual", "mixed"]).optional().default("auto"),
        questionIds: z.array(z.number()).optional(),
        questionPoints: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createExamTemplate } = await import("./db");
        return await createExamTemplate({
          name: input.name,
          description: input.description,
          timeLimit: input.timeLimit,
          passingScore: input.passingScore,
          gradingMethod: input.gradingMethod || "auto",
          createdBy: ctx.user.id,
          questionIds: input.questionIds || [],
          questionPoints: input.questionPoints || [],
        });
      }),
    createFromExam: protectedProcedure
      .input(z.object({
        examId: z.number(),
        name: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createExamTemplateFromExam } = await import("./db");
        return await createExamTemplateFromExam(input.examId, input.name, input.description, ctx.user.id);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        timeLimit: z.number().optional(),
        passingScore: z.number().optional(),
        gradingMethod: z.enum(["auto", "manual", "mixed"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { updateExamTemplate } = await import("./db");
        const { id, ...data } = input;
        await updateExamTemplate(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { deleteExamTemplate } = await import("./db");
        await deleteExamTemplate(input);
        return { success: true };
      }),
    createExamFromTemplate: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { createExamFromTemplate } = await import("./db");
        return await createExamFromTemplate(input.templateId, input.title, input.description, input.status || "draft", ctx.user.id);
      }),
    getQuestions: protectedProcedure
      .input(z.number())
      .query(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canViewAll")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { getExamTemplateQuestions } = await import("./db");
        return await getExamTemplateQuestions(input);
      }),
  }),

  // 錯題本
  wrongQuestionBook: router({
    // 獲取我的錯題列表
    list: protectedProcedure
      .input(z.object({
        questionType: z.string().optional(),
        isReviewed: z.boolean().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const { getUserWrongQuestions } = await import("./wrongQuestionBook");
        return await getUserWrongQuestions(ctx.user.id, input || {});
      }),
    // 獲取錯題統計
    stats: protectedProcedure.query(async ({ ctx }) => {
      const { getWrongQuestionStats } = await import("./wrongQuestionBook");
      return await getWrongQuestionStats(ctx.user.id);
    }),
    // 標記為已複習
    markAsReviewed: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const { markAsReviewed } = await import("./wrongQuestionBook");
        return await markAsReviewed(input, ctx.user.id);
      }),
    // 批次標記為已複習
    batchMarkAsReviewed: protectedProcedure
      .input(z.array(z.number()))
      .mutation(async ({ input, ctx }) => {
        const { batchMarkAsReviewed } = await import("./wrongQuestionBook");
        return await batchMarkAsReviewed(input, ctx.user.id);
      }),
    // 移除錯題記錄
    remove: protectedProcedure
      .input(z.number()) // questionId
      .mutation(async ({ input, ctx }) => {
        const { removeWrongQuestion } = await import("./wrongQuestionBook");
        return await removeWrongQuestion(ctx.user.id, input);
      }),
  }),

  // 成績趨勢分析
  performanceTrend: router({
    // 獲取成績趨勢資料
    trend: protectedProcedure
      .input(z.object({
        days: z.number().optional(),
        isPractice: z.boolean().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const { getUserPerformanceTrend } = await import("./performanceTrend");
        return await getUserPerformanceTrend(ctx.user.id, input || {});
      }),
    // 獲取成績統計摘要
    stats: protectedProcedure
      .input(z.object({
        days: z.number().optional(),
        isPractice: z.boolean().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const { getUserPerformanceStats } = await import("./performanceTrend");
        return await getUserPerformanceStats(ctx.user.id, input || {});
      }),
    // 獲取成績分布
    distribution: protectedProcedure
      .input(z.object({
        days: z.number().optional(),
        isPractice: z.boolean().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const { getUserScoreDistribution } = await import("./performanceTrend");
        return await getUserScoreDistribution(ctx.user.id, input || {});
      }),
  }),

  // 補考機制
  makeupExams: router({
    // 管理員查看待補考列表
    getPending: protectedProcedure.query(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canEdit")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { getPendingMakeupExams } = await import("./makeupExamHelper");
      return await getPendingMakeupExams();
    }),

    // 管理員安排補考
    schedule: protectedProcedure
      .input(
        z.object({
          makeupExamId: z.number(),
          deadline: z.string(), // ISO date string
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { hasPermission } = await import("@shared/permissions");
        if (!hasPermission(ctx.user.role as any, "canEdit")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
        }
        const { scheduleMakeupExam } = await import("./makeupExamHelper");
        return await scheduleMakeupExam(
          input.makeupExamId,
          new Date(input.deadline),
          input.notes || null,
          ctx.user.id
        );
      }),

    // 考生查看自己的補考歷史
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getMakeupExamHistory } = await import("./makeupExamHelper");
      return await getMakeupExamHistory(ctx.user.id);
    }),
  }),

  // 學習建議
  learningRecommendations: router({
    // 考生查看學習建議
    getMyRecommendations: protectedProcedure.query(async ({ ctx }) => {
      const { getLearningRecommendations } = await import("./makeupExamHelper");
      return await getLearningRecommendations(ctx.user.id);
    }),

    // 標記建議為已讀
    markAsRead: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const { markRecommendationAsRead } = await import("./makeupExamHelper");
        return await markRecommendationAsRead(input);
      }),
  }),

  // 通知系統
  notifications: router({
    // 獲取使用者的通知列表
    getMyNotifications: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const { getUserNotifications } = await import("./notificationHelper");
        return await getUserNotifications(ctx.user.id, input?.unreadOnly || false);
      }),

    // 獲取未讀通知數量
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadNotificationCount } = await import("./notificationHelper");
      return await getUnreadNotificationCount(ctx.user.id);
    }),

    // 標記通知為已讀
    markAsRead: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const { markNotificationAsRead } = await import("./notificationHelper");
        return await markNotificationAsRead(input);
      }),

    // 標記所有通知為已讀
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      const { markAllNotificationsAsRead } = await import("./notificationHelper");
      return await markAllNotificationsAsRead(ctx.user.id);
    }),

    // 刪除通知
    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const { deleteNotification } = await import("./notificationHelper");
        return await deleteNotification(input);
      }),

    // 管理員觸發補考提醒（手動觸發）
    triggerMakeupReminders: protectedProcedure.mutation(async ({ ctx }) => {
      const { hasPermission } = await import("@shared/permissions");
      if (!hasPermission(ctx.user.role as any, "canManageUsers")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "沒有權限" });
      }
      const { sendMakeupExamReminders } = await import("./notificationHelper");
      return await sendMakeupExamReminders();
    }),
  }),
});

export type AppRouter = typeof appRouter;
