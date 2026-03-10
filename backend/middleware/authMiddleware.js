import admin from "../utils/firebaseAdmin.js";

export async function authMiddleware(req, res, next) {
  const bearer = req.headers.authorization;
  if (!bearer?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = bearer.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
