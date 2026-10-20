import fs from "fs";
import path from "path";

const brainDir = "C:\\Users\\Reda Tech\\.gemini\\antigravity-ide\\brain";
const dirs = fs.readdirSync(brainDir);

for (const d of dirs) {
  const logFile = path.join(brainDir, d, ".system_generated", "logs", "transcript.jsonl");
  if (!fs.existsSync(logFile)) continue;
  try {
    const content = fs.readFileSync(logFile, "utf8");
    if (
      (content.includes("مصاريف") || content.includes("expenses")) &&
      (content.includes("شيت") || content.includes("sheet")) &&
      (content.includes("نقل") || content.includes("تصدير") || content.includes("مزامنة") || content.includes("sync") || content.includes("export") || content.includes("webhook"))
    ) {
      // Find matching user inputs
      const lines = content.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line);
        if (parsed.type === "USER_INPUT") {
          const t = typeof parsed.content === "string" ? parsed.content : JSON.stringify(parsed.content);
          if (
            (t.includes("مصاريف") || t.includes("daily_expenses")) &&
            (t.includes("شيت") || t.includes("sheet"))
          ) {
            console.log(`\n=== Conv ${d} ===`);
            console.log(t);
          }
        }
      }
    }
  } catch (e) {}
}
