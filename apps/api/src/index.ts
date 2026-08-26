import cors from "cors";
import express from "express";
import { env } from "./env.js";
import { createUserClient } from "./supabase.js";
import { validateAccess } from "./validate-access.js";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    service: "access-control-api",
    health: "/health",
    validate: "POST /access/validate",
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/access/validate", async (req, res) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Missing bearer token",
    });
    return;
  }

  const userClient = createUserClient(token);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    res
      .status(401)
      .json({ ok: false, code: "UNAUTHENTICATED", message: "Invalid session" });
    return;
  }

  try {
    const result = await validateAccess(user.id, req.body);

    if (!result.ok) {
      const status =
        result.code === "INVALID_BODY"
          ? 400
          : result.code === "NO_SHIFT"
            ? 403
            : 403;
      res.status(status).json(result);
      return;
    }

    res.json(result);
  } catch (cause) {
    console.error(cause);
    res
      .status(500)
      .json({ ok: false, code: "INTERNAL", message: "Validation failed" });
  }
});

app.listen(env.port, () => {
  console.log(`API listening on http://127.0.0.1:${env.port}`);
});
