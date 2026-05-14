import { Router } from "express";
import { OracleEndpoint } from "./OracleEndpoint.js";

const router: Router = Router();

router.get("/oracle", async (_req, res) => {
  const pulse = await OracleEndpoint.syncWithCreator({});
  res.json(pulse);
});

export default router;
