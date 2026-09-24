import express from "express";
import bookmarkHandler from "../server-lib/bookmark.js";
import explanationHandler from "../server-lib/explanation.js";
import insightsHandler from "../server-lib/insights.js";
import questionsHandler from "../server-lib/questions.js";
import submitQuizHandler from "../server-lib/submit-quiz.js";
import syncFeedHandler from "../server-lib/sync-feed.js";
import trainingQuestionsHandler from "../server-lib/training-questions.js";
import registerHandler from "../server-lib/auth/register.js";
import scrapeHandler from "../server-lib/cron/scrape.js";
import internalWorkerHandler from "../server-lib/internal/worker.js";
import newsdataHandler from "../server-lib/cron/newsdata.js";
import resetLeaderboardHandler from "../server-lib/cron/reset-leaderboard.js";
import createRazorpayOrderHandler from "../server-lib/create-razorpay-order.js";
import verifyPaymentHandler from "../server-lib/verify-payment.js";
import userLimitsHandler from "../server-lib/user-limits.js";

import { analyticsRouter } from "../server-lib/analytics/routes.js";
import {
  examCatalogHandler,
  examStartHandler,
  examActiveHandler,
  examCheckpointHandler,
  examSubmitHandler,
  examAttemptsHandler,
  examResultHandler,
} from "../server-lib/exam/handlers.js";

const app = express();
app.use(express.json({ limit: '512kb' }));

// Mount verified serverless API route handlers
app.get("/api/cron/scrape", scrapeHandler);
app.post("/api/cron/scrape", scrapeHandler);
app.get("/api/cron/newsdata", newsdataHandler);
app.post("/api/cron/newsdata", newsdataHandler);
app.get("/api/cron/reset-leaderboard", resetLeaderboardHandler);
app.post("/api/cron/reset-leaderboard", resetLeaderboardHandler);

app.all("/api/bookmark", bookmarkHandler);
app.post("/api/explanation", explanationHandler);
app.post("/api/insights", insightsHandler);
app.get("/api/questions", questionsHandler);
app.post("/api/submit-quiz", submitQuizHandler);
app.post("/api/sync-feed", syncFeedHandler);
app.get("/api/internal/worker", internalWorkerHandler);
app.post("/api/training-questions", trainingQuestionsHandler);
app.post("/api/auth/register", registerHandler);
app.post("/api/create-razorpay-order", createRazorpayOrderHandler);
app.post("/api/verify-payment", verifyPaymentHandler);
app.get("/api/user-limits", userLimitsHandler);

app.get("/api/exam/catalog", examCatalogHandler);
app.post("/api/exam/start", examStartHandler);
app.get("/api/exam/active", examActiveHandler);
app.post("/api/exam/checkpoint", examCheckpointHandler);
app.post("/api/exam/submit", examSubmitHandler);
app.get("/api/exam/attempts", examAttemptsHandler);
app.get("/api/exam/result", examResultHandler);

app.use("/api/analytics", analyticsRouter);

export default async function handler(req: any, res: any) {
  return app(req, res);
}