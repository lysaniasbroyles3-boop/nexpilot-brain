
import express from "express";
import OpenAI from "openai";

const app = express();

app.use(express.json({ limit: "20kb" }));

// Allow requests only from your configured Nexora website.
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = process.env.ALLOWED_ORIGIN;

    if (origin && allowed && origin === allowed) {
        res.setHeader("Access-Control-Allow-Origin", allowed);
        res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

// Check whether the server is running.
app.get("/", (req, res) => {
    res.json({ status: "Nexpilot brain is online!" });
});

// AI connection.
app.post("/api/chat", async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({
                error: "The AI service has not been configured yet."
            });
        }

        const messages = req.body.messages;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "Please provide a message."
            });
        }

        const safeMessages = messages
            .slice(-10)
            .filter(message =>
                ["user", "assistant"].includes(message.role) &&
                typeof message.content === "string"
            )
            .map(message => ({
                role: message.role,
                content: message.content.slice(0, 4000)
            }));

        if (!safeMessages.length) {
            return res.status(400).json({
                error: "No valid messages were provided."
            });
        }

        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const response = await client.responses.create({
            model: process.env.OPENAI_MODEL || "gpt-6-luna",
            instructions:
                "You are Nexpilot, the helpful AI director of Nexora. " +
                "Help users plan projects, understand code, organize ideas, " +
                "and improve their workspace. Be clear, friendly, and honest. " +
                "Never claim to have changed files or performed actions unless " +
                "a connected tool actually did so.",
            input: safeMessages
        });

        res.json({
            answer: response.output_text
        });

    } catch (error) {
        console.error("Nexpilot error:", error.message);

        res.status(500).json({
            error: "Nexpilot couldn't generate an answer. Please try again."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Nexpilot brain running on port ${PORT}`);
});
