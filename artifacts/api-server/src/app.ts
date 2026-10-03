import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { isAllowedOrigin, securityHeaders } from "./lib/security";

const app: Express = express();
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, cb) {
      if (isAllowedOrigin(origin)) cb(null, origin || true);
      else cb(null, false);
    },
    methods: ["GET", "POST"],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use("/api", router);

export default app;
