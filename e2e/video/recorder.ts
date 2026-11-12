import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BrowserContext, CDPSession, Locator, Page } from "@playwright/test";

/**
 * Запись демо-видео: кадры берём из Chrome (CDP screencast) в 1280×720 и собираем в WebM (VP9)
 * через ffmpeg, который уже скачан вместе с Playwright. Поверх сайта — субтитры, курсор
 * и подсветка кликов (сайт при этом не меняется: слой добавляется только в записи).
 */

export const FPS = 25;

/** Слой поверх страницы: субтитры, метка сцены, курсор, «круги» от кликов */
export const OVERLAY_SCRIPT = `(() => {
  const KEY = "rec-state";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
  const write = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  const CURSOR = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#17191d" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  function apply(s) {
    const cap = document.getElementById("rec-cap"), tag = document.getElementById("rec-tag"), cur = document.getElementById("rec-cur");
    if (!cap) return;
    cap.textContent = s.cap || ""; cap.style.opacity = s.cap ? "1" : "0";
    tag.textContent = s.tag || ""; tag.style.opacity = s.tag ? "1" : "0";
    cur.style.left = (s.x ?? -60) + "px"; cur.style.top = (s.y ?? -60) + "px";
  }
  function mount() {
    if (document.getElementById("rec-root") || !document.documentElement) return;
    const root = document.createElement("div");
    root.id = "rec-root";
    root.innerHTML = '<style>' +
      '#rec-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:"Onest Variable",system-ui,sans-serif}' +
      '#rec-cap{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);width:max-content;max-width:1000px;padding:12px 22px;border-radius:14px;background:rgba(23,25,29,.9);color:#fff;font-size:21px;font-weight:500;line-height:1.38;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25);transition:opacity .2s}' +
      '#rec-tag{position:absolute;left:50%;transform:translateX(-50%);top:38px;padding:6px 14px;border-radius:999px;background:#244cff;color:#fff;font-size:15px;font-weight:600;box-shadow:0 6px 18px rgba(36,76,255,.35);transition:opacity .2s}' +
      '#rec-cur{position:absolute;margin:-2px 0 0 -3px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}' +
      '.rec-ripple{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #244cff;background:rgba(36,76,255,.15);animation:rec-rp .55s ease-out forwards}' +
      '@keyframes rec-rp{from{transform:scale(.3);opacity:1}to{transform:scale(1.35);opacity:0}}' +
      '</style><div id="rec-tag"></div><div id="rec-cap"></div><div id="rec-cur">' + CURSOR + '</div>';
    document.documentElement.appendChild(root);
    apply(read());
  }
  window.__rec = { set(patch) { const s = { ...read(), ...patch }; write(s); mount(); apply(s); } };
  document.addEventListener("mousemove", (e) => {
    const s = read(); s.x = e.clientX; s.y = e.clientY; write(s);
    const c = document.getElementById("rec-cur"); if (c) { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }
  }, true);
  document.addEventListener("mousedown", (e) => {
    const r = document.createElement("div"); r.className = "rec-ripple";
    r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
    document.getElementById("rec-root")?.appendChild(r); setTimeout(() => r.remove(), 650);
  }, true);
  // Слой монтируем после гидратации React и восстанавливаем, если его что-то убрало
  window.addEventListener("load", mount);
  setInterval(mount, 400);
})();`;

type Frame = { t: number; file: string };
type Cue = { t: number; text: string };

export class Recorder {
  private frames: Frame[] = [];
  private cues: Cue[] = [];
  private cdp!: CDPSession;
  private dir = fs.mkdtempSync(path.join(os.tmpdir(), "dekanat-video-"));
  private tag = "";
  private stoppedAt = 0;

  constructor(private page: Page) {}

  async start(context: BrowserContext) {
    this.cdp = await context.newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", async (e) => {
      const file = path.join(this.dir, `${this.frames.length}.jpg`);
      fs.writeFileSync(file, Buffer.from(e.data, "base64"));
      this.frames.push({ t: e.metadata.timestamp ?? Date.now() / 1000, file });
      await this.cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });
  }

  async stop() {
    // Неподвижный кадр в конце не порождает новых кадров — длину берём по времени остановки
    this.stoppedAt = Date.now() / 1000;
    await this.cdp.send("Page.stopScreencast").catch(() => {});
  }

  // ---------- Субтитры и метка сцены ----------

  /** Новая сцена: метка вверху, прошлая подпись убирается */
  async scene(tag: string) {
    this.tag = tag;
    this.cues.push({ t: Date.now() / 1000, text: "" });
    await this.overlay({ tag, cap: "" });
  }

  async caption(text: string) {
    this.cues.push({ t: Date.now() / 1000, text });
    await this.overlay({ cap: text });
  }

  /** Только запись в субтитры .srt (для слайдов, где подпись нарисована на самом слайде) */
  cue(text: string) {
    this.cues.push({ t: Date.now() / 1000, text });
  }

  /** Убрать подпись, метку и курсор — перед слайдом */
  async hide() {
    await this.overlay({ cap: "", tag: "", x: -60, y: -60 });
  }

  private async overlay(patch: Record<string, unknown>) {
    await this.page
      .evaluate((p) => (window as unknown as { __rec?: { set(x: unknown): void } }).__rec?.set(p), patch)
      .catch(() => {});
  }

  /** Время на чтение вслух: ~2,4 слова в секунду — под живую озвучку */
  static readMs(text: string) {
    return 700 + text.split(/\s+/).length * 420;
  }

  /** Показать субтитр, выполнить действия и выдержать время, нужное на прочтение */
  async say(text: string, action?: () => Promise<unknown>) {
    const started = Date.now();
    await this.caption(text);
    if (action) await action();
    const left = Recorder.readMs(text) - (Date.now() - started);
    if (left > 0) await this.page.waitForTimeout(left);
  }

  async silence(ms = 0) {
    this.cues.push({ t: Date.now() / 1000, text: "" });
    await this.overlay({ cap: "" });
    if (ms) await this.page.waitForTimeout(ms);
  }

  /** После полной перезагрузки страницы слой восстанавливается из localStorage — подтвердим метку */
  async restoreOverlay() {
    await this.overlay({ tag: this.tag });
  }

  // ---------- «Человеческие» действия ----------

  async point(loc: Locator) {
    await loc.scrollIntoViewIfNeeded();
    let box = await loc.boundingBox();
    // Внизу кадра субтитр — элемент поднимаем к центру, чтобы его было видно
    const vh = this.page.viewportSize()?.height ?? 720;
    if (box && (box.y < 60 || box.y + box.height > vh - 150)) {
      await loc.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
      await this.page.waitForTimeout(700);
      box = await loc.boundingBox();
    }
    await this.page.waitForTimeout(150);
    if (!box) return;
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 });
    await this.page.waitForTimeout(250);
  }

  async click(loc: Locator) {
    await this.point(loc);
    await loc.click();
    await this.page.waitForTimeout(450);
  }

  async type(loc: Locator, text: string) {
    await this.click(loc);
    await loc.fill("");
    await loc.pressSequentially(text, { delay: 70 });
  }

  async scrollTo(loc: Locator) {
    await loc.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    await this.page.waitForTimeout(900);
  }

  async scrollTop() {
    await this.page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await this.page.waitForTimeout(700);
  }

  // ---------- Сборка ----------

  /** Склеивает кадры в WebM с постоянной частотой и пишет субтитры .srt */
  async encode(out: string) {
    if (!this.frames.length) throw new Error("Нет кадров");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const t0 = this.frames[0].t;
    const tEnd = Math.max(this.stoppedAt, this.frames[this.frames.length - 1].t) + 0.5;
    const ffmpeg = findFfmpeg();
    const proc = spawn(
      ffmpeg,
      [
        "-y", "-loglevel", "error",
        "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "pipe:0",
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xe8ebed,format=yuv420p",
        "-c:v", "libvpx-vp9", "-crf", "26", "-b:v", "0", "-deadline", "good", "-cpu-used", "4", "-row-mt", "1",
        out,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const done = new Promise<void>((resolve, reject) => {
      proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg завершился с кодом ${code}`))));
      proc.on("error", reject);
    });
    let i = 0;
    for (let t = t0; t <= tEnd; t += 1 / FPS) {
      while (i + 1 < this.frames.length && this.frames[i + 1].t <= t) i++;
      const buf = fs.readFileSync(this.frames[i].file);
      if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once("drain", r));
    }
    proc.stdin.end();
    await done;
    fs.writeFileSync(out.replace(/\.\w+$/, ".srt"), this.srt(t0, tEnd));
    fs.rmSync(this.dir, { recursive: true, force: true });
    return tEnd - t0;
  }

  private srt(t0: number, tEnd: number) {
    const ts = (s: number) => {
      const ms = Math.max(0, Math.round(s * 1000));
      const p = (n: number, l = 2) => String(n).padStart(l, "0");
      return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
    };
    const out: string[] = [];
    this.cues.forEach((c, k) => {
      if (!c.text) return;
      const end = (this.cues[k + 1]?.t ?? tEnd) - t0;
      out.push(`${out.length + 1}\n${ts(c.t - t0)} --> ${ts(end)}\n${c.text}\n`);
    });
    return out.join("\n");
  }
}

/** ffmpeg: из FFMPEG_PATH, из кеша браузеров Playwright или из PATH */
function findFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ??
    (process.platform === "win32"
      ? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"), "ms-playwright")
      : process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Caches", "ms-playwright")
        : path.join(os.homedir(), ".cache", "ms-playwright"));
  if (fs.existsSync(cache)) {
    for (const d of fs.readdirSync(cache).filter((d) => d.startsWith("ffmpeg-")).sort().reverse()) {
      const exe = fs.readdirSync(path.join(cache, d)).find((f) => f.startsWith("ffmpeg"));
      if (exe) return path.join(cache, d, exe);
    }
  }
  return "ffmpeg";
}
