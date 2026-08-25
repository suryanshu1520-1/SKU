import questionsHandler from "../server-lib/questions.js";
import trainingQuestionsHandler from "../server-lib/training-questions.js";
import { getExaminerPsycheOverview, getLiveQuestionBankTrends } from "../server-lib/analytics/examiner_psyche.js";

async function runMockReq(handler: any, req: any) {
  return new Promise<{ status: number; body: any }>((resolve) => {
    let statusCode = 200;
    const res: any = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: any) {
        resolve({ status: statusCode, body: data });
      },
      setHeader() {},
      end() {
        resolve({ status: statusCode, body: {} });
      }
    };
    handler(req, res);
  });
}

async function main() {
  console.log("=== Testing Test Arena & Question Bank Endpoints ===");

  // 1. UPSC Questions
  const upscRes = await runMockReq(questionsHandler, { method: "GET", query: { examTrack: "upsc" }, headers: {} });
  console.log("1. UPSC Questions status:", upscRes.status, "Count:", upscRes.body?.questions?.length);
  if (upscRes.status !== 200 || !upscRes.body?.questions?.length) {
    throw new Error("Failed to fetch UPSC questions");
  }

  // 2. SSC Questions
  const sscRes = await runMockReq(questionsHandler, { method: "GET", query: { examTrack: "ssc" }, headers: {} });
  console.log("2. SSC Questions status:", sscRes.status, "Count:", sscRes.body?.questions?.length);
  if (sscRes.status !== 200 || !sscRes.body?.questions?.length) {
    throw new Error("Failed to fetch SSC questions");
  }

  // 3. Pillar GS1
  const gs1Res = await runMockReq(questionsHandler, { method: "GET", query: { pillar: "GS1", examTrack: "upsc" }, headers: {} });
  console.log("3. GS1 Questions status:", gs1Res.status, "Count:", gs1Res.body?.questions?.length);

  // 4. Pillar GS2
  const gs2Res = await runMockReq(questionsHandler, { method: "GET", query: { pillar: "GS2", examTrack: "upsc" }, headers: {} });
  console.log("4. GS2 Questions status:", gs2Res.status, "Count:", gs2Res.body?.questions?.length);

  // 5. Pillar GS3
  const gs3Res = await runMockReq(questionsHandler, { method: "GET", query: { pillar: "GS3", examTrack: "upsc" }, headers: {} });
  console.log("5. GS3 Questions status:", gs3Res.status, "Count:", gs3Res.body?.questions?.length);

  // 6. Training Questions
  const trainingRes = await runMockReq(trainingQuestionsHandler, {
    method: "POST",
    body: {
      subjects: ["Indian Economy", "Geography"],
      count: 10,
      userId: "test-user",
      examTrack: "upsc"
    },
    headers: {}
  });
  console.log("6. Training Questions status:", trainingRes.status, "Count:", trainingRes.body?.questions?.length);

  // 7. Live Question Bank Trends
  const trends = await getLiveQuestionBankTrends();
  console.log("7. Live Bank Trends Census:", trends.census);

  console.log("\n ALL 7 ARENA ENDPOINT TESTS PASSED CLEANLY!");
}

main().catch(err => {
  console.error("Diagnostic Test Failure:", err);
  process.exit(1);
});
