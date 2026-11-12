"use client";

import { useActionState, useRef, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { login, type LoginState } from "./actions";

export type DemoAccount = { login: string; password: string; who: string; what: string };


export function LoginForm({ demo }: { demo: DemoAccount[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [show, setShow] = useState(false);
  const loginRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  function fill(l: string, p: string) {
    if (loginRef.current && passRef.current) {
      loginRef.current.value = l;
      passRef.current.value = p;
      passRef.current.focus();
    }
  }

  return (
    <>
      <form action={action} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login" className="label">
            Логин
          </label>
          <input
            ref={loginRef}
            id="login"
            name="login"
            className="input"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state?.login}
            required
            aria-invalid={!!state?.error}
            aria-describedby={state?.error ? "login-error" : undefined}
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Пароль
          </label>
          <div className="relative">
            <input
              ref={passRef}
              id="password"
              name="password"
              type={show ? "text" : "password"}
              className="input pr-12"
              autoComplete="current-password"
              required
              aria-invalid={!!state?.error}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink"
              aria-label={show ? "Скрыть пароль" : "Показать пароль"}
            >
              {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        {state?.error && (
          <p id="login-error" role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm font-medium text-bad">
            {state.error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {pending ? "Входим…" : "Войти"}
        </button>
      </form>

      {demo.length > 0 && (
      <div className="mt-8">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Демо-доступ для жюри</p>
        <ul className="grid grid-cols-1 gap-2">
          {demo.map((d) => (
            <li key={d.login}>
              <button
                type="button"
                onClick={() => fill(d.login, d.password)}
                className="flex w-full flex-col items-start gap-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-accent-ink sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="w-full min-w-0 sm:w-auto sm:flex-1">
                  <span className="block truncate text-sm font-semibold">{d.who}</span>
                  <span className="block truncate text-xs text-muted">{d.what}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {d.login} / {d.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Нажмите на аккаунт — логин и пароль подставятся в форму.</p>
      </div>
      )}
    </>
  );
}
