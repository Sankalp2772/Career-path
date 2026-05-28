const express = require("express");
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {

  try {

    const { question } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `
    You are a Career AI Assistant.

    Help students with:
    - career guidance
    - roadmap planning
    - skills
    - opportunities
    - comparisons

    User Question:
    ${question}
    `;

    const result = await model.generateContent(prompt);

    const response = result.response.text();

    res.json({
      answer: response
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      answer: "AI failed to respond."
    });
  }
});

module.exports = router;