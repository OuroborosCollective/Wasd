export function editorRoutes() {
  return {
    path: "/editor",
    method: "POST",
    handler: (req: any, res: any) => {
      res.json({ status: "editor routes placeholder" });
    }
  };
}