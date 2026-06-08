import { apiFetch } from "../lib/http";
import type { ProductQuestion, Pagination } from "../lib/types";

type QuestionsRes = {
  status: string;
  data: { questions: ProductQuestion[] };
  pagination: Pagination;
};

type QuestionRes = { status: string; data: { question: ProductQuestion } };

export async function getQuestions(productId: string, page = 1): Promise<{ questions: ProductQuestion[]; pagination: Pagination }> {
  const res = await apiFetch<QuestionsRes>(`/api/v1/products/${productId}/questions?page=${page}&limit=10`);
  return { questions: res.data.questions, pagination: res.pagination };
}

export async function createQuestion(productId: string, question: string): Promise<ProductQuestion> {
  const res = await apiFetch<QuestionRes>(`/api/v1/products/${productId}/questions`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
  return res.data.question;
}

export async function answerQuestion(questionId: string, answer: string): Promise<void> {
  await apiFetch(`/api/v1/questions/${questionId}/answers`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await apiFetch(`/api/v1/questions/${questionId}`, { method: "DELETE" });
}
