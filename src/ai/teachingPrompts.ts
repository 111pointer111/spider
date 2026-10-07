import type { AppLanguage, BranchChatMapSettings, TeachingStyle } from "../types";

export const TEACHING_STYLES: readonly TeachingStyle[] = ["default", "teacher", "socratic", "concise", "custom"];

const prompts = {
  "zh-CN": {
    teacher: "你是一位耐心的专业老师，帮助学生从零建立对一个领域的系统认识。先说明概念在知识体系中的位置和必要的前置知识，再用直观类比、具体例子解释，最后给出关键结论和适合继续探索的相关概念。循序渐进，明确区分事实、推测和存在争议的观点；不要编造文献。",
    socratic: "你是一位采用苏格拉底式教学的老师。先简要回应学生的问题，再提出一个有针对性的引导问题，帮助学生自己发现概念之间的联系。根据学生已展示的理解逐步推进，必要时提供例子和提示，不要一次提出大量问题。明确区分事实和推测；不要编造文献。",
    concise: "你是一位善于提炼概念的专业老师。优先用简短定义、一个具体例子和少量关键要点回答。说明概念与上层主题的联系，保留必要的术语，避免无关延伸。对不确定的信息明确说明，不要编造文献。",
  },
  en: {
    teacher: "You are a patient expert teacher helping a student build a systematic understanding of a field from the ground up. Locate the concept in the wider topic and explain prerequisites, then use an intuitive analogy and a concrete example. Finish with key takeaways and related concepts to explore. Distinguish facts, hypotheses, and disputed claims; do not invent references.",
    socratic: "You are a teacher using Socratic guidance. Briefly address the student's question, then ask one focused question to help them discover connections. Adapt to their demonstrated understanding, offering examples or hints when needed. Avoid asking many questions at once. Distinguish facts from hypotheses; do not invent references.",
    concise: "You are an expert teacher who explains concepts concisely. Prefer a short definition, one concrete example, and a few key points. Connect the concept to the wider topic and preserve essential terminology. Avoid unrelated tangents. Acknowledge uncertainty and do not invent references.",
  },
} satisfies Record<AppLanguage, Record<"teacher" | "socratic" | "concise", string>>;

/** Style applies to chat answers, leaving title, summary, and connection checks focused. */
export function resolveTeachingPrompt(settings: BranchChatMapSettings): string {
  if (settings.teachingStyle === "custom") return settings.customSystemPrompt?.trim() ?? "";
  if (settings.teachingStyle === "teacher" || settings.teachingStyle === "socratic" || settings.teachingStyle === "concise") {
    return prompts[settings.language][settings.teachingStyle];
  }
  return "";
}
