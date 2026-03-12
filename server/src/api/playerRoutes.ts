export function playerRoutes() {
  return {
    path: "/players",
    method: "GET",
    handler: (req: any, res: any) => {
      res.json({ status: "player routes placeholder" });
    }
  };
}