import jwt from "jsonwebtoken";

export function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não informado." });
  }

  const [, token] = authHeader.split(" ");

  if (!token) {
    return res.status(401).json({ erro: "Token mal formatado." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}