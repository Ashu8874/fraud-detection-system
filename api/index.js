let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const [{ app }, { connectToDatabase }] = await Promise.all([
        import("../backend/src/app.js"),
        import("../backend/src/db/mongoose.js")
      ]);

      await connectToDatabase();
      return app;
    })();
  }

  return appPromise;
}

module.exports = async (req, res) => {
  const app = await getApp();
  return app(req, res);
};
