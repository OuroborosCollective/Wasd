import { healthRoute } from "./healthRoute.js";
import { playerRoutes } from "./playerRoutes.js";
import { worldRoutes } from "./worldRoutes.js";
import { editorRoutes } from "./editorRoutes.js";
import { chatRoute } from "./chatRoute.js";
import { adminRoute } from "./adminRoute.js";
import { oracleRoute } from "./oracleRoute.js";
import { authRoute } from "./authRoute.js";
import { mailRoute } from "./mailRoute.js";
import { auctionRoute } from "./auctionRoute.js";

export const ApiRoutes = [
  healthRoute(),
  playerRoutes(),
  worldRoutes(),
  editorRoutes(),
  chatRoute(),
  adminRoute(),
  oracleRoute(),
  authRoute(),
  mailRoute(),
  auctionRoute()
];