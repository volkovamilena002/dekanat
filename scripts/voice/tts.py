"""
Озвучка фраз для демо-видео нейроголосом Microsoft (пакет edge-tts).

    python scripts/voice/tts.py <голос> <папка> <фразы.json>

фразы.json — [{"id": "...", "text": "..."}]. Для каждой фразы создаётся <папка>/<id>.mp3
(уже готовые не перезаписываются), в stdout печатается JSON {id: длительность_в_мс}.
Нужны пакеты edge-tts и imageio-ffmpeg (ставятся в .venv — см. README).
"""
import asyncio
import json
import os
import re
import subprocess
import sys

import edge_tts
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def duration_ms(path: str) -> int:
    out = subprocess.run([FFMPEG, "-hide_banner", "-i", path], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", out)
    if not m:
        raise RuntimeError(f"Не удалось узнать длительность {path}")
    h, mnt, s = m.groups()
    return round((int(h) * 3600 + int(mnt) * 60 + float(s)) * 1000)


async def main() -> None:
    voice, out_dir, phrases_file = sys.argv[1:4]
    os.makedirs(out_dir, exist_ok=True)
    with open(phrases_file, encoding="utf-8") as f:
        phrases = json.load(f)
    result = {}
    for p in phrases:
        path = os.path.join(out_dir, f"{p['id']}.mp3")
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            # Сервис иногда отвечает пустотой на частые запросы — повторяем с нарастающей паузой
            for attempt in range(6):
                try:
                    await edge_tts.Communicate(p["text"], voice).save(path)
                    break
                except Exception:
                    if os.path.exists(path):
                        os.remove(path)
                    if attempt == 5:
                        raise
                    await asyncio.sleep(2 * (attempt + 1))
            await asyncio.sleep(0.4)
        result[p["id"]] = duration_ms(path)
    sys.stdout.write(json.dumps(result))


asyncio.run(main())
