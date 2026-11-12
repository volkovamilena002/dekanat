import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Озвучка нейроголосом Microsoft через edge-tts (scripts/voice/tts.py, Python из .venv).
 * Если окружения нет — озвучка просто отключается, видео пишется с одними субтитрами.
 * Голос: VIDEO_VOICE=ru-RU-SvetlanaNeural (по умолчанию ru-RU-DmitryNeural).
 */

const ROOT = process.cwd();
const PY = [path.join(ROOT, ".venv", "Scripts", "python.exe"), path.join(ROOT, ".venv", "bin", "python")].find((p) => fs.existsSync(p));

/** Как читать слова, которые нейроголос произносит плохо (на субтитры не влияет) */
const SPEAK: [RegExp, string][] = [
  [/Claude Code/g, "Клод Код"],
  [/по стандарту доступности WCAG/g, "по международному стандарту доступности"],
  [/WCAG/g, "вэ-кэ-а-гэ"],
  [/«|»/g, ""],
];
const speakable = (t: string) => SPEAK.reduce((s, [re, to]) => s.replace(re, to), t);

export type VoiceClip = { file: string; ms: number };

export class Voice {
  readonly name = process.env.VIDEO_VOICE ?? "ru-RU-DmitryNeural";
  private clips = new Map<string, VoiceClip>();
  private dir = path.join(ROOT, "video", "voice");
  readonly ffmpeg: string;

  private constructor(private python: string) {
    this.ffmpeg = spawnSync(python, ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"], { encoding: "utf8" }).stdout.trim();
  }

  static create(): Voice | null {
    if (process.env.VIDEO_VOICE === "off" || !PY) return null;
    const ok = spawnSync(PY, ["-c", "import edge_tts, imageio_ffmpeg"]).status === 0;
    return ok ? new Voice(PY) : null;
  }

  /** Озвучить все фразы заранее (готовые берутся из кэша video/voice) */
  prepare(texts: string[]) {
    const items = [...new Set(texts)].map((text) => ({
      text,
      id: createHash("sha1").update(`${this.name}|${speakable(text)}`).digest("hex").slice(0, 12),
    }));
    fs.mkdirSync(this.dir, { recursive: true });
    const run = (list: { id: string; text: string }[]) => {
      const file = path.join(this.dir, "phrases.json");
      fs.writeFileSync(file, JSON.stringify(list));
      return spawnSync(this.python, [path.join(ROOT, "scripts", "voice", "tts.py"), this.name, this.dir, file], {
        encoding: "utf8",
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        timeout: 120_000,
      });
    };
    // Сервис начинает отвечать пустотой, если в одном соединении много запросов подряд,
    // поэтому каждую новую фразу озвучиваем отдельным процессом, с повторами
    for (const i of items) {
      if (fs.existsSync(path.join(this.dir, `${i.id}.mp3`))) continue;
      for (let attempt = 1; ; attempt++) {
        const r = run([{ id: i.id, text: speakable(i.text) }]);
        if (r.status === 0) break;
        if (attempt === 4) throw new Error(`Озвучка не удалась: «${i.text}»\n${r.stderr}`);
        spawnSync(process.execPath, ["-e", `setTimeout(() => {}, ${3000 * attempt})`]);
      }
    }
    // Все файлы уже есть — этот вызов только меряет длительности
    const r = run(items.map((i) => ({ id: i.id, text: speakable(i.text) })));
    if (r.status !== 0) throw new Error(`Озвучка не удалась: ${r.stderr}`);
    const ms = JSON.parse(r.stdout) as Record<string, number>;
    for (const i of items) this.clips.set(i.text, { file: path.join(this.dir, `${i.id}.mp3`), ms: ms[i.id] });
  }

  get(text: string) {
    return this.clips.get(text);
  }
}
