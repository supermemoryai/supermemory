import app from ".";

// TODO: write more tests
describe("Test the application", () => {
  it("Should return 200 response", async () => {
    const res = await app.request("http://localhost/");
    expect(res.status).toBe(200);
  }),
    it("Should return 404 response", async () => {
      const res = await app.request("http://localhost/404");
      expect(res.status).toBe(404);
    });
});
