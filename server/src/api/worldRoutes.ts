export function worldRoutes() {
  return {
    path: "/world",
    method: "GET",
    handler: (req: any, res: any) => {
      res.json({ status: "world routes placeholder" });
    }
  };
}