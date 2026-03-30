import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("13 - Image & Gallery", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("13.1 should list images from gallery endpoint", async () => {
    const r = await tauriInvoke("list_all_images_with_thumbnails") as any;
    // May or may not have images depending on whether 08's upload succeeded
    expect(r.ok).toBeDefined();
    expect(Array.isArray(r.ok)).toBe(true);
  });

  it("13.2 should have date field on gallery images", async () => {
    const r = await tauriInvoke("list_all_images_with_thumbnails") as any;
    if (r.ok.length > 0) {
      expect(r.ok[0].date).toBeDefined();
      expect(r.ok[0].date.length).toBe(10);
    }
  });

  it("13.3 should get thumbnail for image", async () => {
    const images = ((await tauriInvoke("list_all_images_with_thumbnails")) as any).ok;
    if (images.length > 0) {
      const r = await tauriInvoke("get_thumbnail", { imageId: images[0].id }) as any;
      expect(r.ok).toBeDefined();
      expect(r.ok.length).toBeGreaterThan(0);
    }
  });

  it("13.4 should get full image data", async () => {
    const images = ((await tauriInvoke("list_all_images_with_thumbnails")) as any).ok;
    if (images.length > 0) {
      const r = await tauriInvoke("get_full_image", { imageId: images[0].id }) as any;
      expect(r.ok).toBeDefined();
      expect(r.ok.length).toBeGreaterThan(0);
    }
  });
});
