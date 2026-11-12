# Деплой на VPS

Цель: сайт открывается из России без VPN по HTTPS и работает до объявления итогов (28.11.2026).
Время: 20–30 минут. Программировать не нужно — только копировать команды.

## Что понадобится
- **VPS у российского провайдера** (Timeweb Cloud, Selectel, Yandex Cloud, Beget и т. п.):
  Ubuntu 24.04, от 2 ГБ RAM, от 20 ГБ диска. На 1 ГБ RAM сборка может не поместиться —
  тогда включите swap (шаг 3).
- **Код в репозитории** (GitHub или GitVerse) — он всё равно нужен жюри.
- **Адрес сайта.** Подойдёт бесплатный вида `1-2-3-4.sslip.io` (1-2-3-4 — IP сервера через
  дефисы). Если хочется солиднее и надёжнее — купите домен `.ru` и направьте его A-запись на IP.

## 1. Подключиться к серверу
IP и пароль root выдаст провайдер. В терминале на своём компьютере:
```bash
ssh root@IP_СЕРВЕРА
```

## 2. Установить Docker и Git
Ставим из репозитория Ubuntu — он доступен из России:
```bash
apt update && apt install -y docker.io docker-compose-v2 git
```

Если на шаге 6 Docker не сможет скачать образы (`postgres`, `caddy`, `node`) — Docker Hub
бывает недоступен из России. Включите зеркало и перезапустите Docker:
```bash
mkdir -p /etc/docker && echo '{"registry-mirrors": ["https://mirror.gcr.io"]}' > /etc/docker/daemon.json && systemctl restart docker
```
У многих провайдеров есть собственное зеркало Docker Hub — адрес ищите в их документации.

## 3. (Только если RAM меньше 2 ГБ) включить swap
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 4. Открыть порты
```bash
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
```

## 5. Скачать код и заполнить настройки
```bash
git clone https://github.com/ВАШ_АККАУНТ/dekanat.git && cd dekanat
```
```bash
cp deploy/.env.example .env && sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
```
Впишите адрес сайта (замените IP на свой):
```bash
sed -i "s/^SITE_ADDRESS=.*/SITE_ADDRESS=1-2-3-4.sslip.io/" .env
```
Пароль базы сгенерирован случайно и хранится только в `.env` на сервере.

## 6. Запустить
```bash
docker compose up -d --build
```
Первая сборка занимает 3–7 минут. Затем создайте таблицы и демо-данные (один раз):
```bash
docker compose run --rm tools npm run db:setup
```

## 7. Проверить
- `https://1-2-3-4.sslip.io` — страница входа (сертификат Caddy получит сам за ~30 секунд).
- `https://1-2-3-4.sslip.io/api/health` — должно быть `{"ok":true,...}`.
- **Обязательно** откройте сайт с телефона через мобильный интернет **без VPN**.

## Обновление после изменений в коде
```bash
cd ~/dekanat && git pull && docker compose up -d --build && docker compose run --rm tools npm run db:migrate
```

## Перед отправкой работы жюри
Демо-данные привязаны к текущей дате (заявки «вчера», переносы на этой неделе). Пересоздайте их
в день отправки, чтобы всё выглядело свежим. **Внимание: стирает все данные в базе.**
```bash
docker compose run --rm tools npm run db:setup
```

## Если что-то не так
- Логи приложения: `docker compose logs -f app`
- Логи HTTPS: `docker compose logs -f caddy` (частая причина — закрыт порт 80/443 или
  неверный `SITE_ADDRESS`)
- Состояние контейнеров: `docker compose ps`
- Перезапуск: `docker compose restart app`

## Как это устроено
| Контейнер | Что делает |
|---|---|
| `caddy` | принимает HTTPS, сам получает и продлевает сертификат Let's Encrypt |
| `app` | сайт (Next.js, Node 24), без исходников и dev-зависимостей |
| `db` | PostgreSQL 17, данные в томе `pgdata` (переживают перезапуски) |
| `tools` | разовые задачи: миграции и демо-данные |

Все контейнеры перезапускаются автоматически после сбоя или перезагрузки сервера.
