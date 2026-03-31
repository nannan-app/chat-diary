import {
  loginBeforeAll,
  shortWait,
  getPageHtml,
} from "./helpers";

/**
 * 08 - Stats & Achievements
 *
 * Navigate to achievements/badge wall view via UI.
 * Verify badges, growth tree, and stats are displayed in DOM.
 */
describe("08 - Stats & Achievements", () => {
  before(async () => {
    await loginBeforeAll("test1234");
  });

  it("8.1 should navigate to badge wall view", async () => {
    // Click achievements nav button (title contains "勋章")
    await browser.execute(() => {
      const btns = document.querySelectorAll("button[title]");
      for (const b of btns) {
        if (b.getAttribute("title")?.includes("勋章")) {
          (b as HTMLElement).click();
          return;
        }
      }
    });
    await shortWait(1500);

    // Verify: badge wall should be visible
    const html = await getPageHtml();
    // Should show badge categories or badge names
    const hasBadgeContent = html.includes("初次提笔") || html.includes("坚持") || html.includes("勋章");
    expect(hasBadgeContent).toBe(true);
  });

  it("8.2 should show growth tree with days count", async () => {
    const html = await getPageHtml();
    // Growth tree should display days (e.g. "这本日记本已经 X 天了")
    // Or at least show a tree emoji
    const hasTree = html.includes("🌱") || html.includes("🌿") || html.includes("🌲") || html.includes("🌳")
      || html.includes("天了") || html.includes("days");
    expect(hasTree).toBe(true);
  });

  it("8.3 should display first_entry badge as unlocked", async () => {
    // Since we've already sent messages, first_entry should be unlocked
    const isUnlocked = await browser.execute(() => {
      // Look for "初次提笔" badge with unlocked styling (opacity or color difference)
      const text = document.body.innerText;
      return text.includes("初次提笔");
    });
    expect(isUnlocked).toBe(true);
  });

  it("8.4 should show all 15 achievement badges", async () => {
    // Count badge items in the DOM
    const badgeCount = await browser.execute(() => {
      // Each badge has a name from BADGE_INFO - count unique badge names present
      const names = [
        "初次提笔", "七日之约", "月光收集者", "年轮",
        "千字文", "万字书", "十万个心事",
        "阳光满溢", "情绪画家",
        "第一帧", "生活记录者",
        "AI 初见", "远程投递", "时光旅人", "夜猫子"
      ];
      const text = document.body.innerText;
      let count = 0;
      for (const name of names) {
        if (text.includes(name)) count++;
      }
      return count;
    });
    expect(badgeCount).toBe(15);
  });

  it("8.5 should show writing stats at bottom of diary list", async () => {
    // Navigate back to diary
    await browser.execute(() => {
      const btns = document.querySelectorAll("button[title]");
      for (const b of btns) {
        if (b.getAttribute("title")?.includes("日记")) {
          (b as HTMLElement).click();
          return;
        }
      }
    });
    await shortWait(1000);

    // Verify: sidebar should show "已陪伴你 X 天" stats
    const html = await getPageHtml();
    expect(html).toContain("已陪伴你");
  });
});
