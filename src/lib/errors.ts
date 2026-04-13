export class AppError extends Error {
  statusCode?: number;
  code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const FALLBACK_QUIZ_ERROR_MESSAGE = "حدث خطأ غير متوقع. حاول مرة أخرى.";

export function formatQuizErrorResponse(error: unknown): {
  isCorrect: false;
  message: string;
  newPowerLevel: 0;
  correctOption: "";
  explanation: "";
} {
  if (error instanceof AppError) {
    return {
      isCorrect: false,
      message: error.message || FALLBACK_QUIZ_ERROR_MESSAGE,
      newPowerLevel: 0,
      correctOption: "",
      explanation: "",
    };
  }

  return {
    isCorrect: false,
    message: FALLBACK_QUIZ_ERROR_MESSAGE,
    newPowerLevel: 0,
    correctOption: "",
    explanation: "",
  };
}
