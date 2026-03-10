import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const visionModel = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";

export async function detectIngredientsFromImage(imageBase64) {
  if (!openai || !imageBase64) return [];

  const completion = await openai.chat.completions.create({
    model: visionModel,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Identify edible ingredients visible in the image. Return ONLY JSON: {\"ingredients\":[\"...\"]}",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "List ingredients visible in this image." },
          {
            type: "image_url",
            image_url: { url: imageBase64 },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = completion.choices?.[0]?.message?.content || "{\"ingredients\":[]}";
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
  } catch {
    return [];
  }
}
