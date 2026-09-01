import cors from "cors";
import express from "express";
import { corsOrigins, env } from "./env.js";
import { lookupAccess } from "./lookup-access.js";
import { createUserClient } from "./supabase.js";
import { validateAccess } from "./validate-access.js";
import {
  validateOwnerAccess,
  validateResidentByQr,
} from "./validate-owner-access.js";

const app = express();

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    service: "access-control-api",
    health: "/health",
    lookup: "POST /access/lookup",
    validate: "POST /access/validate",
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function requireApiUser(req: express.Request, res: express.Response) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Missing bearer token",
    });
    return null;
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
    return null;
  }

  return user;
}

app.post("/access/lookup", async (req, res) => {
  const user = await requireApiUser(req, res);
  if (!user) {
    return;
  }

  try {
    const result = await lookupAccess(user.id, req.body);

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
      .json({ ok: false, code: "INTERNAL", message: "Lookup failed" });
  }
});

app.post("/access/validate", async (req, res) => {
  const user = await requireApiUser(req, res);
  if (!user) {
    return;
  }

  try {
    const body = req.body as Record<string, unknown>;
    if (
      typeof body.profileId === "string" &&
      typeof body.propertyId === "string"
    ) {
      const result = await validateOwnerAccess(user.id, body);
      if (!result.ok) {
        const status =
          result.code === "INVALID_BODY" || result.code === "INVALID_PLATE"
            ? 400
            : 403;
        res.status(status).json(result);
        return;
      }
      res.json(result);
      return;
    }

    if (typeof body.qrToken === "string") {
      const invitationResult = await validateAccess(user.id, body);
      if (invitationResult.ok) {
        res.json(invitationResult);
        return;
      }

      if (invitationResult.code !== "INVALID_QR") {
        const status =
          invitationResult.code === "INVALID_BODY" ||
          invitationResult.code === "INVALID_PLATE"
            ? 400
            : 403;
        res.status(status).json(invitationResult);
        return;
      }

      const residentResult = await validateResidentByQr(user.id, body);
      if (!residentResult.ok) {
        const status =
          residentResult.code === "INVALID_BODY" ||
          residentResult.code === "INVALID_PLATE"
            ? 400
            : residentResult.code === "INVALID_QR"
              ? 403
              : 403;
        res.status(status).json(residentResult);
        return;
      }

      res.json(residentResult);
      return;
    }

    res.status(400).json({
      ok: false,
      code: "INVALID_BODY",
      message: "Provide qrToken or profileId and propertyId",
    });
  } catch (cause) {
    console.error(cause);
    res
      .status(500)
      .json({ ok: false, code: "INTERNAL", message: "Validation failed" });
  }
});

app.listen(env.port, "0.0.0.0", () => {
  console.log(`API listening on port ${env.port}`);
});
